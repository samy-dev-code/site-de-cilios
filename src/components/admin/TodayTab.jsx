import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import MaintenanceModal from './MaintenanceModal';

const STATUS = {
  pending: { label: 'Pendente', cls: 'border-amber-400/40 bg-amber-500/10 text-amber-200' },
  confirmed: { label: 'Confirmado', cls: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' },
  in_progress: { label: 'Em andamento', cls: 'border-violet-400/40 bg-violet-500/10 text-violet-200' },
  completed: { label: 'Concluído', cls: 'border-sky-400/40 bg-sky-500/10 text-sky-200' },
  cancelled: { label: 'Cancelado', cls: 'border-red-400/40 bg-red-500/10 text-red-200' },
  rescheduled: { label: 'Reagendado', cls: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200' },
};
const fmtBRL = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
const asArray = (v) => (Array.isArray(v) ? v : []);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function TodayTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [expanded, setExpanded] = useState(null); // id com detalhes abertos
  const [history, setHistory] = useState({});
  const [rescheduling, setRescheduling] = useState(null);
  const [maintaining, setMaintaining] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('appointments')
      .select('*, services(name, duration_minutes, price), promotions(name, participants), appointment_participants(name, participant_number)')
      .eq('appointment_date', todayISO())
      .order('appointment_time');
    if (err) {
      console.error('TodayTab/load:', err.message);
      setError('Não foi possível carregar os atendimentos de hoje.');
      setItems([]);
    } else {
      setItems(asArray(data));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Atualização automática quando qualquer agendamento mudar
  useEffect(() => {
    const channel = supabase
      .channel('today-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const adminName = useMemo(() => 'Admin', []);

  async function changeStatus(id, status) {
    setBusyId(id);
    setMsg(null);
    const { data, error: err } = await supabase.rpc('set_appointment_status', {
      p_appointment_id: id, p_status: status, p_changed_by: adminName,
    });
    setBusyId(null);
    if (err || !data?.ok) {
      console.error('TodayTab/status:', err?.message || data?.error);
      setMsg({ kind: 'error', text: data?.error || 'Não foi possível atualizar o status. Tente novamente.' });
    } else {
      load();
    }
  }

  async function openDetails(id) {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (!next || history[id]) return;
    const { data, error: err } = await supabase
      .from('appointment_history')
      .select('*')
      .eq('appointment_id', id)
      .order('created_at', { ascending: true });
    if (err) {
      console.error('TodayTab/history:', err.message);
      setHistory((h) => ({ ...h, [id]: [] }));
    } else {
      setHistory((h) => ({ ...h, [id]: asArray(data) }));
    }
  }

  // Resumo do dia
  const summary = useMemo(() => {
    const active = items.filter((a) => a.status !== 'cancelled');
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
    const upcoming = active
      .filter((a) => toMin(a.appointment_time) >= nowMin)
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    return {
      total: items.length,
      done: items.filter((a) => a.status === 'completed').length,
      pending: items.filter((a) => a.status === 'pending' || a.status === 'confirmed' || a.status === 'in_progress').length,
      cancelled: items.filter((a) => a.status === 'cancelled').length,
      nextTime: upcoming[0]?.appointment_time?.slice(0, 5) ?? '—',
      expected: active.reduce((s, a) => s + Number(a.final_amount ?? 0), 0),
    };
  }, [items]);

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-serif text-2xl text-lavender-soft">Quem vou atender hoje</h2>
          <p className="text-sm text-plum-200/60">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <button onClick={load} className="rounded-full border border-white/10 px-4 py-2 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition">Atualizar</button>
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          ['Atendimentos', summary.total],
          ['Concluídos', summary.done],
          ['Pendentes', summary.pending],
          ['Cancelados', summary.cancelled],
          ['Próximo horário', summary.nextTime],
          ['Valor previsto', fmtBRL(summary.expected)],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-2xl px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-plum-300/60">{label}</p>
            <p className="mt-1 text-lg font-medium text-lavender-soft truncate">{value}</p>
          </div>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${msg.kind === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>
          {msg.text}
        </div>
      )}

      {error && (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-sm text-red-200">{error}</p>
          <button onClick={load} className="mt-4 rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender hover:bg-lavender/10 transition">Tentar novamente</button>
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-sm text-plum-200/70">Nenhum atendimento agendado para hoje. 💜</p>
        </div>
      )}

      {!error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((a) => (
            <TodayCard
              key={a.id}
              a={a}
              busyId={busyId}
              onChangeStatus={changeStatus}
              expanded={expanded === a.id}
              onToggleDetails={() => openDetails(a.id)}
              history={history[a.id] ?? []}
              onReschedule={() => setRescheduling(a)}
              onMaintenance={() => setMaintaining(a)}
            />
          ))}
        </ul>
      )}

      {maintaining && (
        <MaintenanceModal
          original={maintaining}
          onClose={() => setMaintaining(null)}
          onDone={(ok) => {
            setMaintaining(null);
            setMsg(ok
              ? { kind: 'ok', text: 'Manutenção agendada com sucesso! Ela aparecerá na aba Hoje no dia marcado e no Histórico da cliente.' }
              : { kind: 'error', text: 'Não foi possível agendar a manutenção.' });
            if (ok) load();
          }}
        />
      )}

      {rescheduling && (
        <RescheduleForm
          a={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={(ok, text) => {
            setRescheduling(null);
            setMsg(ok ? { kind: 'ok', text: 'Agendamento remarcado com sucesso!' } : { kind: 'error', text });
            if (ok) load();
          }}
        />
      )}
    </div>
  );
}

function TodayCard({ a, busyId, onChangeStatus, expanded, onToggleDetails, history, onReschedule, onMaintenance }) {
  const st = STATUS[a.status] ?? STATUS.pending;
  const dur = a.duration_minutes ?? a.services?.duration_minutes ?? 60;
  const isPromo = Boolean(a.promotion_id && a.promotions);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const [h, m] = String(a.appointment_time).split(':').map(Number);
  const startMin = h * 60 + (m || 0);
  const isActiveSlot = a.status === 'in_progress' || (a.status === 'confirmed' && nowMin >= startMin && nowMin < startMin + dur);
  const isNext = (a.status === 'pending' || a.status === 'confirmed') && nowMin < startMin;

  const ring = a.status === 'cancelled'
    ? 'opacity-60'
    : isActiveSlot
      ? 'ring-2 ring-violet-400/60'
      : isNext
        ? 'ring-2 ring-emerald-400/50'
        : '';

  return (
    <li className={`glass rounded-2xl p-4 text-sm ${ring}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-lavender-soft">
            {a.client_name}
            {isNext && <span className="ml-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] text-emerald-200">Próximo</span>}
            {isActiveSlot && <span className="ml-2 rounded-full bg-violet-500/20 border border-violet-400/40 px-2 py-0.5 text-[10px] text-violet-200">Em andamento</span>}
          </p>
          <p className="text-xs text-plum-200/70 mt-0.5">
            {a.appointment_time.slice(0, 5)} · {dur} min · {isPromo ? `Promoção: ${a.promotions?.name}` : a.services?.name ?? 'Serviço removido'}
            {isPromo && a.participants_count > 1 && ` · ${a.participants_count} participantes`}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-plum-200/70">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${a.appointment_type === 'maintenance' ? 'border-lavender/40 bg-lavender/10 text-lavender' : 'border-white/10 bg-white/5 text-plum-200/70'}`}>
              {a.appointment_type === 'maintenance' ? 'Manutenção' : 'Serviço'}
            </span>
            <span>{fmtBRL(a.final_amount)}</span>
            <span className="text-plum-300/60">{STATUS[a.status]?.label ?? a.status}</span>
          </p>
          {isPromo && asArray(a.appointment_participants).length > 0 && (
            <p className="mt-1 text-xs text-plum-200/60">Participantes: {asArray(a.appointment_participants).map((p) => p.name).join(', ')}</p>
          )}
          {a.notes && <p className="mt-1 text-xs text-plum-200/60 italic">“{a.notes}”</p>}
          {a.rescheduled_from_date && (
            <p className="mt-1 text-xs text-fuchsia-200/80">
              Reagendado de {a.rescheduled_from_date.split('-').reverse().join('/')} às {String(a.rescheduled_from_time).slice(0, 5)}
            </p>
          )}
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] ${st.cls}`}>{st.label}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {a.status === 'pending' && (
          <button disabled={busyId === a.id} onClick={() => onChangeStatus(a.id, 'confirmed')} className="tap-btn rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 text-xs text-emerald-200 hover:bg-emerald-500/25 transition disabled:opacity-50">Aprovar</button>
        )}
        {(a.status === 'confirmed' || a.status === 'pending') && (
          <button disabled={busyId === a.id} onClick={() => onChangeStatus(a.id, 'in_progress')} className="tap-btn rounded-full border border-violet-400/40 px-4 text-xs text-violet-200 hover:bg-violet-500/10 transition disabled:opacity-50">Iniciar atendimento</button>
        )}
        {(a.status === 'confirmed' || a.status === 'in_progress') && (
          <button disabled={busyId === a.id} onClick={() => onChangeStatus(a.id, 'completed')} className="tap-btn rounded-full border border-sky-400/40 px-4 text-xs text-sky-200 hover:bg-sky-500/10 transition disabled:opacity-50">Concluir atendimento</button>
        )}
        {a.status !== 'cancelled' && a.status !== 'completed' && (
          <button disabled={busyId === a.id} onClick={onReschedule} className="tap-btn rounded-full border border-white/10 px-4 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition disabled:opacity-50">Reagendar</button>
        )}
        {a.status === 'completed' && (
          <button disabled={busyId === a.id} onClick={onMaintenance} className="tap-btn rounded-full border border-lavender/40 bg-lavender/10 px-4 text-xs text-lavender hover:bg-lavender/20 transition disabled:opacity-50">Agendar manutenção</button>
        )}
        {a.status !== 'cancelled' && a.status !== 'completed' && (
          <button disabled={busyId === a.id} onClick={() => onChangeStatus(a.id, 'cancelled')} className="tap-btn rounded-full border border-red-400/40 bg-red-500/15 px-4 text-xs text-red-200 hover:bg-red-500/25 transition disabled:opacity-50">Cancelar</button>
        )}
        <button onClick={onToggleDetails} className="tap-btn rounded-full border border-white/10 px-4 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition">
          {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-widest text-plum-300/60 mb-2">Histórico do agendamento</p>
          {history.length === 0 ? (
            <p className="text-xs text-plum-200/60">Nenhuma alteração registrada.</p>
          ) : (
            <ul className="space-y-1.5">
              {history.map((h2) => (
                <li key={h2.id} className="text-xs text-plum-200/80">
                  <span className="text-plum-300/60">
                    {new Date(h2.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>{' '}
                  — {h2.description}{h2.changed_by ? ` (por ${h2.changed_by})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function RescheduleForm({ a, onClose, onDone }) {
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const date = f.get('date');
    const time = f.get('time');
    setSaving(true);
    const { data, error: err } = await supabase.rpc('reschedule_appointment', {
      p_appointment_id: a.id,
      p_new_date: date,
      p_new_time: time,
      p_reason: reason || null,
      p_changed_by: 'Admin',
    });
    setSaving(false);
    if (err) {
      console.error('RescheduleForm:', err.message);
      onDone(false, 'Erro de conexão ao reagendar. Tente novamente.');
    } else if (!data?.ok) {
      onDone(false, data?.error || 'Não foi possível reagendar.');
    } else {
      onDone(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-6 space-y-4">
        <h4 className="font-serif text-xl text-lavender-soft">Reagendar: {a.client_name}</h4>
        <p className="text-xs text-plum-200/70">
          Atual: {a.appointment_date.split('-').reverse().join('/')} às {a.appointment_time.slice(0, 5)} · {a.duration_minutes ?? a.services?.duration_minutes ?? 60} min
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-lavender/70">Nova data</label>
            <input type="date" name="date" required min={todayISO()} defaultValue={a.appointment_date}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-lavender/70" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-lavender/70">Novo horário</label>
            <input type="time" name="time" required step={900} defaultValue={a.appointment_time.slice(0, 5)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-lavender/70" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-widest text-lavender/70">Motivo (opcional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: cliente pediu para trocar"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
        </div>
        <p className="text-[11px] text-plum-300/60">A disponibilidade é revalidada no servidor antes de salvar.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-4 py-2 text-xs text-plum-200/70 hover:text-lavender transition">Voltar</button>
          <button type="submit" disabled={saving} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-5 py-2 text-xs text-white hover:brightness-110 transition disabled:opacity-60">
            {saving ? 'Salvando…' : 'Confirmar reagendamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
