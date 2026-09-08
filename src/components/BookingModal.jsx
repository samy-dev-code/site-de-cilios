import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../integrations/supabase/client';
import { buildPixPayload, buildBookingMessage, openWhatsApp } from '../utils/payment';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const STEPS = ['Serviço', 'Data', 'Horário', 'Seus dados', 'Pagamento', 'Confirmação'];

const PAYMENTS = [
  {
    id: 'pix',
    label: 'PIX',
    desc: 'Pague agora pelo app do seu banco com o QR Code ao lado.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.1a2.6 2.6 0 0 1 1.85.77l3.7 3.7h-2.6a3.9 3.9 0 0 0-3.9 3.9v.06a3.9 3.9 0 0 1-3.9 3.9H2.87a2.6 2.6 0 0 1 0-3.68L10.15 2.87A2.6 2.6 0 0 1 12 2.1Zm8.9 9.9a1.3 1.3 0 0 1 0 1.84l-7.05 7.05a2.6 2.6 0 0 1-3.68 0l-3.7-3.7h2.6a3.9 3.9 0 0 0 3.9-3.9v-.06a3.9 3.9 0 0 1 3.9-3.9h4.28a1.3 1.3 0 0 1 .92.38ZM2.9 10.55a1.3 1.3 0 0 1-.93-2.21L8.6 1.72a2.6 2.6 0 0 1 .62-.46L2.9 8.58a1.3 1.3 0 0 0 0 1.84l7.05 7.05a2.6 2.6 0 0 0 3.68 0l3.7-3.7h-2.6a3.9 3.9 0 0 1-3.9-3.9v-.06a3.9 3.9 0 0 0-3.9-3.9H2.9Z"/></svg>
    ),
  },
  {
    id: 'cash',
    label: 'Dinheiro',
    desc: 'Pagamento presencial no estúdio, no dia do atendimento.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>
    ),
  },
  {
    id: 'card',
    label: 'Cartão (Débito/Crédito)',
    desc: 'Processamento na maquininha presencial no estúdio.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>
    ),
  },
];

const PAYMENT_LABELS = { pix: 'PIX', cash: 'Dinheiro', card: 'Cartão (Débito/Crédito)' };

const brl = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Spinner() {
  return <span className="h-5 w-5 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender align-middle" />;
}

function Stepper({ step }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-gradient-to-r from-plum-500 to-lavender' : 'w-4 bg-white/10'}`} title={label} />
        </div>
      ))}
    </div>
  );
}

function fmtBR(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export default function BookingModal({ services, loading = false, error = null, onClose }) {
  const [step, setStep] = useState(0);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [hours, setHours] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [takenSlots, setTakenSlots] = useState({});
  const [checking, setChecking] = useState(false);
  const [payment, setPayment] = useState(null);
  const [pix, setPix] = useState({ pix_key: '', pix_holder_name: '', pix_city: '' });
  const [hoursError, setHoursError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);

  // Trava o scroll do fundo enquanto o modal está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Horários de funcionamento e folgas
  const loadHours = async () => {
    setHoursError(null);
    const [h, b] = await Promise.all([
      supabase.from('business_hours').select('*'),
      supabase.from('blocked_dates').select('blocked_date, reason').gte('blocked_date', toISO(new Date())),
    ]);
    if (h.error) setHoursError(h.error.message);
    if (h.data) setHours(h.data);
    if (b.data) setBlocked(b.data);
    const s = await supabase.from('settings').select('key, value').in('key', ['pix_key', 'pix_holder_name', 'pix_city']);
    if (s.data) setPix(Object.fromEntries(s.data.map((r) => [r.key, r.value])));
  };

  useEffect(() => { loadHours(); }, []);

  // Agenda do dia selecionado (validação de conflito em tempo real)
  useEffect(() => {
    if (!date) return;
    let mounted = true;
    setChecking(true);
    supabase
      .from('appointments')
      .select('appointment_time, status, service_id, services(duration_minutes)')
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed'])
      .then(({ data }) => {
        if (mounted) {
          setTakenSlots(data ?? []);
          setChecking(false);
        }
      });
    return () => { mounted = false; };
  }, [date]);

  const hoursFor = (weekday) => {
    const h = hours.find((x) => x.weekday === weekday);
    return h && h.is_open && h.open_time && h.close_time ? h : null;
  };

  const slots = useMemo(() => {
    if (!date || !service) return [];
    const d = new Date(`${date}T12:00:00`);
    const h = hoursFor(d.getDay());
    if (!h) return [];
    const [oh, om] = h.open_time.split(':').map(Number);
    const [ch] = h.close_time.split(':').map(Number);
    const stepMin = 30;
    const total = service.duration_minutes;
    const out = [];
    for (let m = oh * 60 + om; m + total <= ch * 60; m += stepMin) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const label = `${hh}:${mm}`;
      const start = m, end = m + total;
      const conflict = takenSlots.some((a) => {
        const [ah, am] = a.appointment_time.split(':').map(Number);
        const aStart = ah * 60 + am;
        const aDur = a.services?.duration_minutes ?? 60;
        return start < aStart + aDur && aStart < end;
      });
      out.push({ label, conflict });
    }
    return out;
  }, [date, service, hours, takenSlots]);

  // Calendário do mês (navegação simples)
  const [cursor, setCursor] = useState(() => new Date());
  const today = toISO(new Date());
  const days = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const count = new Date(y, m + 1, 0).getDate();
    const cells = Array(first.getDay()).fill(null);
    for (let d = 1; d <= count; d++) cells.push(toISO(new Date(y, m, d)));
    return cells;
  }, [cursor]);

  const blockedMap = useMemo(() => Object.fromEntries(blocked.map((b) => [b.blocked_date, b.reason])), [blocked]);

  const canContinue = [!!service, !!date, !!time && !checking, name.trim().length >= 3 && whatsapp.replace(/\D/g, '').length >= 10, !!payment, true][step];

  const pixPayload = useMemo(
    () => (pix.pix_key ? buildPixPayload({ key: pix.pix_key, name: pix.pix_holder_name, city: pix.pix_city, amount: service?.price, txid: 'MARI-LASH' }) : ''),
    [pix, service]
  );

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Revalidação final de conflito no banco antes de inserir
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id, services(duration_minutes)')
        .eq('appointment_date', date)
        .eq('appointment_time', time)
        .in('status', ['pending', 'confirmed']);
      if (conflicts && conflicts.length > 0) {
        setSubmitError('Ops! Este horário acabou de ser preenchido por outra pessoa. Escolha outro, por favor.');
        setSubmitting(false);
        return;
      }
      const { error: err } = await supabase.from('appointments').insert({
        service_id: service.id,
        client_name: name.trim(),
        client_whatsapp: whatsapp.trim(),
        appointment_date: date,
        appointment_time: time,
        payment_method: payment || 'pending',
        notes: notes.trim() || null,
      });
      if (err) throw err;
      openWhatsApp(buildBookingMessage({
        service: service.name,
        date: `${WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]}, ${fmtBR(date)}`,
        time,
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        notes: notes.trim(),
        paymentLabel: PAYMENT_LABELS[payment] || 'A combinar',
        amount: service.price,
      }));
      setDone(true);
    } catch (e) {
      setSubmitError(e.message || 'Não foi possível concluir o agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(0); setService(null); setDate(null); setTime(null);
    setName(''); setWhatsapp(''); setNotes(''); setPayment(null); setDone(false); setSubmitError(null);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#0a0308]/85 p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div
        className="glass rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 sm:p-8 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="py-20 text-center">
            <Spinner />
            <p className="mt-4 text-sm text-plum-200/70">Preparando seu agendamento… ✦</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 text-2xl">😔</div>
            <h3 className="mt-5 font-serif text-2xl text-gradient">Não foi possível carregar</h3>
            <p className="mt-3 text-sm text-plum-200/80">Verifique sua conexão e tente novamente.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={onClose} className="rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender hover:bg-lavender/10 transition">Fechar</button>
              <button onClick={() => window.location.reload()} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2 text-sm text-white hover:brightness-110 transition">Tentar de novo</button>
            </div>
          </div>
        ) : done ? (
          <div className="text-center py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-plum-500 to-lavender shadow-xl shadow-plum-600/40">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 className="mt-6 font-serif text-3xl text-gradient">Agendamento recebido!</h3>
            <p className="mt-3 text-plum-200/85 text-sm leading-relaxed">
              Recebemos seu pedido, <strong className="text-lavender-soft">{name.split(' ')[0]}</strong>! 💜
              <br />A Mari vai confirmar seu horário pelo WhatsApp em breve.
            </p>
            <div className="mt-6 glass rounded-2xl p-5 text-left text-sm text-plum-200/90 space-y-1.5">
              <p><span className="text-lavender/70">Serviço:</span> {service.name}</p>
              <p><span className="text-lavender/70">Data:</span> {fmtBR(date)}</p>
              <p><span className="text-lavender/70">Horário:</span> {time}</p>
              <p><span className="text-lavender/70">Valor:</span> {brl(service.price)}</p>
              <p><span className="text-lavender/70">Pagamento:</span> {PAYMENT_LABELS[payment] || 'A combinar'}</p>
            </div>
            <button onClick={reset} className="mt-6 rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender hover:bg-lavender/10 transition">Fazer outro agendamento</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl text-gradient">Agendar horário</h3>
              <button onClick={onClose} aria-label="Fechar" className="text-plum-300/70 hover:text-lavender transition text-2xl leading-none">×</button>
            </div>
            <Stepper step={step} />
            <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-lavender/70">{STEPS[step]}</p>

            {submitError && (
              <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{submitError}</div>
            )}

            {/* Passo 0 — Serviço */}
            {step === 0 && (
              <div className="space-y-3">
                {services.length === 0 && <p className="text-center text-sm text-plum-200/70">Nenhum serviço disponível no momento.</p>}
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setService(s); setStep(1); }}
                    className={`w-full rounded-2xl border px-5 py-4 text-left transition ${service?.id === s.id ? 'border-lavender bg-lavender/10' : 'border-white/10 hover:border-lavender/50 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-lg text-lavender-soft">{s.name}</span>
                      <span className="text-gradient font-medium">{brl(s.price)}</span>
                    </div>
                    <p className="mt-1 text-xs text-plum-200/70">{s.duration_minutes} min · {s.description?.slice(0, 70)}{s.description?.length > 70 ? '…' : ''}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Passo 1 — Data */}
            {step === 1 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-full border border-white/10 px-3 py-1 text-lavender hover:bg-white/5 transition">←</button>
                  <span className="font-serif text-lg text-lavender-soft">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
                  <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-full border border-white/10 px-3 py-1 text-lavender hover:bg-white/5 transition">→</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-plum-300/60 mb-2">
                  {WEEKDAYS.map((w) => <span key={w}>{w.slice(0, 3)}</span>)}
                </div>
                {hoursError && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <span>Não conseguimos carregar os horários de atendimento.</span>
                    <button onClick={loadHours} className="shrink-0 rounded-full border border-red-300/40 px-3 py-1 text-xs hover:bg-red-400/10 transition">Tentar novamente</button>
                  </div>
                )}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((iso, i) => {
                    if (!iso) return <span key={`e${i}`} />;
                    const d = new Date(`${iso}T12:00:00`);
                    const past = iso < today;
                    const closed = iso >= today && !hoursFor(d.getDay());
                    const bl = blockedMap[iso];
                    const disabled = past || (iso >= today && (closed || !!bl));
                    return (
                      <button
                        key={iso}
                        disabled={disabled}
                        title={bl || (closed ? 'Fechado' : '')}
                        onClick={() => { setDate(iso); setTime(null); setStep(2); }}
                        className={`aspect-square rounded-lg text-sm transition ${date === iso ? 'bg-gradient-to-br from-plum-500 to-lavender text-white font-semibold' : disabled ? 'text-plum-300/25' : 'text-plum-100 hover:bg-lavender/15'}`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between gap-3">
                  <button onClick={() => setStep(0)} className="text-sm text-plum-300/70 hover:text-lavender transition">← Voltar</button>
                </div>
              </div>
            )}

            {/* Passo 2 — Horário */}
            {step === 2 && (
              <div>
                <p className="text-sm text-plum-200/80 mb-4">{service.name} · {fmtBR(date)} · {service.duration_minutes} min</p>
                {checking ? (
                  <div className="py-10 text-center"><Spinner /><p className="mt-3 text-sm text-plum-200/70">Verificando disponibilidade…</p></div>
                ) : slots.length === 0 ? (
                  <p className="py-8 text-center text-sm text-plum-200/70">Sem horários disponíveis neste dia. Escolha outra data. 💜</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.label}
                        disabled={s.conflict}
                        onClick={() => { setTime(s.label); setStep(3); }}
                        className={`rounded-xl border px-2 py-2.5 text-sm transition ${time === s.label ? 'border-lavender bg-lavender/15 text-white' : s.conflict ? 'border-white/5 text-plum-300/25 line-through cursor-not-allowed' : 'border-white/10 text-plum-100 hover:border-lavender/60 hover:bg-white/5'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4"><button onClick={() => setStep(1)} className="text-sm text-plum-300/70 hover:text-lavender transition">← Voltar</button></div>
              </div>
            )}

            {/* Passo 3 — Dados da cliente */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Nome completo *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
                  />
                  {name.length > 0 && name.trim().length < 3 && <p className="mt-1 text-xs text-red-300/80">Digite seu nome completo.</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">WhatsApp *</label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
                  />
                  {whatsapp.length > 0 && whatsapp.replace(/\D/g, '').length < 10 && <p className="mt-1 text-xs text-red-300/80">Informe um WhatsApp válido com DDD.</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Observações (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Alguma alergia, preferência ou detalhe que a Mari deva saber?"
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
                  />
                </div>
                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(2)} className="text-sm text-plum-300/70 hover:text-lavender transition">← Voltar</button>
                </div>
              </div>
            )}

            {/* Passo 4 — Pagamento */}
            {step === 4 && (
              <div>
                <div className="space-y-3">
                  {PAYMENTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPayment(p.id)}
                      className={`w-full rounded-2xl border px-5 py-4 text-left flex items-start gap-3 transition ${payment === p.id ? 'border-lavender bg-lavender/10' : 'border-white/10 hover:border-lavender/50 hover:bg-white/5'}`}
                    >
                      <span className={`mt-0.5 text-lavender ${payment === p.id ? 'text-lavender-soft' : 'text-lavender/60'}`}>{p.icon}</span>
                      <span>
                        <span className="block font-serif text-lg text-lavender-soft">{p.label}</span>
                        <span className="block text-xs text-plum-200/70">{p.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {payment === 'pix' && pix.pix_key && (
                  <div className="mt-5 glass rounded-2xl p-5 text-center">
                    <p className="mb-3 text-xs uppercase tracking-widest text-lavender/70">Escaneie para pagar {brl(service.price)}</p>
                    <div className="mx-auto inline-block rounded-xl bg-white p-3">
                      <QRCodeSVG value={pixPayload} size={168} level="M" />
                    </div>
                    <p className="mt-3 break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-plum-200/80">{pixPayload}</p>
                    <button
                      onClick={() => navigator.clipboard?.writeText(pixPayload)}
                      className="mt-2 rounded-full border border-lavender/40 px-4 py-1.5 text-xs text-lavender hover:bg-lavender/10 transition"
                    >
                      Copiar código PIX
                    </button>
                    <p className="mt-3 text-xs text-plum-200/60">Após pagar, toque em "Finalizar" — a confirmação final é feita pelo WhatsApp. 💜</p>
                  </div>
                )}
                {payment === 'cash' && (
                  <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-plum-200/80">
                    💵 O pagamento em <strong className="text-lavender-soft">dinheiro</strong> é feito presencialmente no estúdio, no dia do atendimento. Traga o valor exato de {brl(service.price)} se possível.
                  </p>
                )}
                {payment === 'card' && (
                  <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-plum-200/80">
                    💳 O pagamento no <strong className="text-lavender-soft">cartão (débito ou crédito)</strong> é processado na maquininha presencialmente no estúdio, no dia do atendimento.
                  </p>
                )}

                <div className="mt-5 flex justify-between items-center">
                  <button onClick={() => setStep(3)} className="text-sm text-plum-300/70 hover:text-lavender transition">← Voltar</button>
                  <button
                    onClick={() => setStep(5)}
                    disabled={!payment}
                    className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110 disabled:opacity-50"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* Passo 5 — Confirmação */}
            {step === 5 && (
              <div>
                <div className="glass rounded-2xl p-5 text-sm text-plum-200/90 space-y-2">
                  <p><span className="text-lavender/70">Serviço:</span> {service.name} ({service.duration_minutes} min)</p>
                  <p><span className="text-lavender/70">Data:</span> {WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]}, {fmtBR(date)}</p>
                  <p><span className="text-lavender/70">Horário:</span> {time}</p>
                  <p><span className="text-lavender/70">Nome:</span> {name}</p>
                  <p><span className="text-lavender/70">WhatsApp:</span> {whatsapp}</p>
                  {notes && <p><span className="text-lavender/70">Observações:</span> {notes}</p>}
                  <div className="divider-fade my-2" />
                  <p><span className="text-lavender/70">Pagamento:</span> {PAYMENT_LABELS[payment] || 'A combinar'}</p>
                  <p className="text-gradient font-serif text-xl">{brl(service.price)}</p>
                </div>
                <div className="mt-5 flex justify-between items-center">
                  <button onClick={() => setStep(4)} className="text-sm text-plum-300/70 hover:text-lavender transition">← Voltar</button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110 disabled:opacity-60"
                  >
                    {submitting ? (<span className="flex items-center gap-2"><Spinner /> Confirmando…</span>) : 'Confirmar agendamento ✦'}
                  </button>
                </div>
              </div>
            )}

            {/* Navegação inferior para os passos 0–2 */}
            {step === 0 && canContinue === false && (
              <p className="mt-4 text-center text-xs text-plum-300/50">Toque em um serviço para começar ✦</p>
            )}
            {(step === 1 || step === 2) && date && (
              <button
                onClick={() => setStep(3)}
                disabled={!canContinue}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-plum-600 to-plum-400 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110 disabled:opacity-50"
              >
                Continuar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
