import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const brl = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
const asArray = (v) => (Array.isArray(v) ? v : []);
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtBR = (iso) => iso?.split('-').reverse().join('/');

// Fluxo de "Agendar manutenção": abre o calendário com os dados da cliente
// já preenchidos, mostra apenas serviços de manutenção e valida a
// disponibilidade no backend (RPC create_maintenance_booking) ao confirmar.
export default function MaintenanceModal({ original, onClose, onDone }) {
  const [services, setServices] = useState(null); // null = carregando
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [hours, setHours] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [taken, setTaken] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  const today = toISO(new Date());

  const loadBase = useCallback(async () => {
    setError(null);
    const [cats, svc, h, b] = await Promise.all([
      supabase.from('categories').select('id, slug').eq('slug', 'manutencao').maybeSingle(),
      supabase.from('services').select('id, name, price, promotional_price, duration_minutes, category_id').eq('active', true).eq('archived', false).order('display_order'),
      supabase.from('business_hours').select('*'),
      supabase.from('blocked_dates').select('blocked_date, reason').gte('blocked_date', today),
    ]);
    if (svc.error || h.error || b.error) {
      console.error('MaintenanceModal/load:', svc.error?.message || h.error?.message || b.error?.message);
      setError('Não foi possível carregar os dados de manutenção.');
      setServices([]);
      return;
    }
    const catId = cats.data?.id;
    const maintenance = catId
      ? asArray(svc.data).filter((s) => s.category_id === catId)
      : asArray(svc.data).filter((s) => /manuten/i.test(s.name ?? ''));
    setServices(maintenance);
    setHours(asArray(h.data));
    setBlocked(asArray(b.data));
  }, [today]);

  useEffect(() => { loadBase(); }, [loadBase]);

  // Agenda do dia selecionado (conflitos em tempo real)
  useEffect(() => {
    if (!date) return;
    let mounted = true;
    setChecking(true);
    supabase
      .from('appointments')
      .select('appointment_time, status, service_id, services(duration_minutes)')
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .then(({ data, error: err }) => {
        if (!mounted) return;
        setChecking(false);
        if (err) { console.error('MaintenanceModal/slots:', err.message); setTaken([]); return; }
        setTaken(asArray(data));
      });
    return () => { mounted = false; };
  }, [date]);

  const hoursFor = (weekday) => {
    const h = hours.find((x) => x.weekday === weekday);
    return h && h.is_open && h.open_time && h.close_time ? h : null;
  };

  const duration = useMemo(
    () => Number(asArray(services).find((s) => s.id === serviceId)?.duration_minutes) || 60,
    [services, serviceId]
  );

  const slots = useMemo(() => {
    if (!date || !serviceId) return [];
    const h = hoursFor(new Date(`${date}T12:00:00`).getDay());
    if (!h) return [];
    const [oh, om] = h.open_time.split(':').map(Number);
    const [ch] = h.close_time.split(':').map(Number);
    const out = [];
    for (let m = oh * 60 + om; m + duration <= ch * 60; m += 30) {
      const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const end = m + duration;
      const conflict = asArray(taken).some((a) => {
        if (typeof a?.appointment_time !== 'string' || !a.appointment_time.includes(':')) return false;
        const [ah, am] = a.appointment_time.split(':').map(Number);
        const aStart = ah * 60 + (am || 0);
        const aDur = Number(a.services?.duration_minutes) || 60;
        return m < aStart + aDur && aStart < end;
      });
      out.push({ label, conflict });
    }
    return out;
  }, [date, serviceId, duration, hours, taken]);

  const blockedMap = useMemo(() => Object.fromEntries(asArray(blocked).map((b) => [b.blocked_date, b.reason])), [blocked]);

  const days = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const count = new Date(y, m + 1, 0).getDate();
    const cells = Array(first.getDay()).fill(null);
    for (let d = 1; d <= count; d++) cells.push(toISO(new Date(y, m, d)));
    return cells;
  }, [cursor]);

  async function submit() {
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('create_maintenance_booking', {
      p_original_appointment_id: original.id,
      p_service_id: serviceId,
      p_date: date,
      p_time: time,
      p_notes: notes.trim() || null,
    });
    setSaving(false);
    if (err) {
      console.error('MaintenanceModal/submit:', err.message);
      setError('Erro de conexão ao agendar a manutenção. Tente novamente.');
      return;
    }
    if (!data?.ok) {
      setError(data?.error || 'Não foi possível agendar a manutenção.');
      return;
    }
    onDone?.(true);
  }

  const selectedService = asArray(services).find((s) => s.id === serviceId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-3 sm:p-4" onClick={onClose}>
      <div className="glass sheet-safe max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h4 className="font-serif text-xl text-lavender-soft">Agendar manutenção</h4>
          <p className="mt-1 text-xs text-plum-200/70">
            Cliente: <strong className="text-plum-100">{original.client_name}</strong> · {original.client_whatsapp}
          </p>
          <p className="text-xs text-plum-200/50">
            Origem: atendimento de {fmtBR(original.appointment_date)} às {String(original.appointment_time).slice(0, 5)}
          </p>
        </div>

        {services === null ? (
          <div className="flex justify-center py-8"><span className="h-6 w-6 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>
        ) : services.length === 0 ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Nenhum serviço de manutenção cadastrado. Crie um serviço na aba "Serviços" (pode usar a categoria "Manutenção") para habilitar esta ação.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-lavender/70">Serviço de manutenção</label>
              <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTime(null); }}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-lavender/70">
                <option value="">Escolha…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes ?? 60} min · {brl(s.promotional_price ?? s.price)}</option>
                ))}
              </select>
            </div>

            {serviceId && (
              <>
                <div className="flex items-center justify-between">
                  <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Mês anterior" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-plum-200 hover:border-lavender/50">‹</button>
                  <p className="font-serif text-base text-plum-100">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
                  <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Próximo mês" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-plum-200 hover:border-lavender/50">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-plum-300/50">
                  {WEEKDAYS.map((d) => <span key={d}>{d.slice(0, 3)}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((iso, i) => {
                    if (!iso) return <span key={`e${i}`} />;
                    const open = hoursFor(new Date(`${iso}T12:00:00`).getDay());
                    const disabled = iso < today || !!blockedMap[iso] || !open;
                    return (
                      <button key={iso} disabled={disabled}
                        title={blockedMap[iso] || (!open ? 'Fechado' : undefined)}
                        onClick={() => { setDate(iso); setTime(null); }}
                        className={`aspect-square rounded-lg text-sm transition ${
                          date === iso ? 'bg-gradient-to-r from-plum-600 to-lavender text-white'
                            : disabled ? 'text-plum-200/25' : 'text-plum-100 hover:bg-plum-800/50'
                        }`}>
                        {Number(iso.slice(-2))}
                      </button>
                    );
                  })}
                </div>

                {date && (
                  <div>
                    <p className="mb-2 text-xs text-plum-200/70">Horários em {fmtBR(date)}:</p>
                    {checking ? (
                      <div className="flex justify-center py-4"><span className="h-5 w-5 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>
                    ) : slots.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-center text-xs text-plum-200/70">Sem horários livres neste dia.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {slots.map((s) => (
                          <button key={s.label} disabled={s.conflict} onClick={() => setTime(s.label)}
                            className={`rounded-lg border px-1 py-2 text-xs transition ${
                              s.conflict ? 'cursor-not-allowed border-white/5 text-plum-200/30 line-through'
                                : time === s.label ? 'border-transparent bg-gradient-to-r from-plum-600 to-lavender text-white'
                                : 'border-white/10 text-plum-100 hover:border-lavender/50'
                            }`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-widest text-lavender/70">Observações (opcional)</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: preenchimento"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
                </div>

                {selectedService && (
                  <p className="text-xs text-plum-200/60">
                    {selectedService.name} · {fmtBR(date)} às {time ?? '—'} · {brl(selectedService.promotional_price ?? selectedService.price)}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-4 py-2 text-xs text-plum-200/70 hover:text-lavender transition">Voltar</button>
          <button onClick={submit} disabled={saving || !serviceId || !date || !time}
            className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-5 py-2 text-xs font-medium text-white hover:brightness-110 transition disabled:opacity-50">
            {saving ? 'Agendando…' : 'Confirmar manutenção'}
          </button>
        </div>
        <p className="text-[11px] text-plum-300/50">A disponibilidade é revalidada no servidor antes de salvar.</p>
      </div>
    </div>
  );
}
