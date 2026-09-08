import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const STATUS = {
  pending: { label: 'Pendente', cls: 'border-amber-400/40 bg-amber-500/10 text-amber-200' },
  confirmed: { label: 'Confirmado', cls: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' },
  cancelled: { label: 'Cancelado', cls: 'border-red-400/40 bg-red-500/10 text-red-200' },
  completed: { label: 'Concluído', cls: 'border-sky-400/40 bg-sky-500/10 text-sky-200' },
};
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtBR = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`; };

function timeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

export default function AgendaTab() {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(null); // dia ISO selecionado
  const [view, setView] = useState('month'); // month | list
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // agendamento em remarcação

  const [error, setError] = useState(null);

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s] = await Promise.all([
      supabase.from('appointments').select('*, services(name, duration_minutes, price)').order('appointment_date').order('appointment_time'),
      supabase.from('services').select('*').order('sort_order'),
    ]);
    if (a.error || s.error) setError(a.error?.message || s.error?.message || 'Erro ao carregar a agenda.');
    else setError(null);
    setItems(asArray(a.data));
    setServices(asArray(s.data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    setBusyId(id);
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    setBusyId(null);
    if (!error) setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  async function remove(id) {
    if (!window.confirm('Excluir este agendamento permanentemente?')) return;
    setBusyId(id);
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    setBusyId(null);
    if (!error) setItems((prev) => prev.filter((a) => a.id !== id));
  }

  async function saveReschedule(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    setBusyId(editing.id);
    const { error } = await supabase
      .from('appointments')
      .update({ appointment_date: f.get('date'), appointment_time: f.get('time') })
      .eq('id', editing.id);
    setBusyId(null);
    if (!error) {
      setItems((prev) => prev.map((a) => (a.id === editing.id ? { ...a, appointment_date: f.get('date'), appointment_time: f.get('time') } : a)));
      setEditing(null);
    } else {
      alert('Não foi possível remarcar. Verifique se o horário está livre.');
    }
  }

  // Calendário do mês
  const days = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    const cells = Array(new Date(y, m, 1).getDay()).fill(null);
    for (let d = 1; d <= count; d++) cells.push(toISO(new Date(y, m, d)));
    return cells;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = {};
    for (const a of items) {
      if (a.status === 'cancelled') continue;
      (map[a.appointment_date] ??= []).push(a);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const rows = [...items].sort((x, y) => (x.appointment_date + x.appointment_time).localeCompare(y.appointment_date + y.appointment_time));
    return filter === 'all' ? rows : rows.filter((a) => a.status === filter);
  }, [items, filter]);

  const selectedList = selected ? (byDate[selected] ?? []) : [];

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  if (error) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <p className="text-sm text-red-200">{error}</p>
        <button onClick={load} className="mt-4 rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender hover:bg-lavender/10 transition">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-full border border-white/10 overflow-hidden">
          {['month', 'list'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 text-xs transition ${view === v ? 'bg-lavender/20 text-lavender-soft' : 'text-plum-200/60 hover:text-lavender'}`}>
              {v === 'month' ? 'Calendário' : 'Lista'}
            </button>
          ))}
        </div>
        {view === 'list' && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs text-plum-100 outline-none focus:border-lavender/60">
            <option value="all">Todos os status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        )}
        <div className="ml-auto text-sm text-plum-200/70">
          {items.filter((a) => a.status === 'pending').length} pendente(s) · {items.filter((a) => a.status === 'confirmed').length} confirmado(s)
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-full border border-white/10 px-3 py-1 text-lavender hover:bg-white/5 transition">←</button>
              <span className="font-serif text-xl text-lavender-soft">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-full border border-white/10 px-3 py-1 text-lavender hover:bg-white/5 transition">→</button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[9px] sm:text-[11px] text-plum-300/60 mb-2">
              {WEEKDAYS.map((w) => <span key={w}>{w.slice(0, 3)}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {days.map((iso, i) => {
                if (!iso) return <span key={`e${i}`} />;
                const list = byDate[iso] ?? [];
                const has = list.length > 0;
                const hasPending = list.some((a) => a.status === 'pending');
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={`aspect-square min-h-9 rounded-lg text-xs sm:text-sm relative transition ${selected === iso ? 'bg-gradient-to-br from-plum-500 to-lavender text-white font-semibold' : has ? 'bg-lavender/15 text-lavender-soft hover:bg-lavender/25' : 'text-plum-100 hover:bg-white/5'}`}
                  >
                    {Number(iso.slice(-2))}
                    {hasPending && !has && <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-1.5 w-1.5 rounded-full bg-amber-300" />}
                    {has && (
                      <span className="absolute bottom-0.5 sm:bottom-1 left-0 right-0 flex justify-center gap-0.5">
                        {list.slice(0, 3).map((a) => (
                          <span key={a.id} className={`h-1 w-1 rounded-full ${a.status === 'pending' ? 'bg-amber-300' : 'bg-emerald-300'}`} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="glass rounded-3xl p-6">
            <h3 className="font-serif text-xl text-lavender-soft mb-4">
              {selected ? `${WEEKDAYS[new Date(`${selected}T12:00:00`).getDay()]}, ${fmtBR(selected)}` : 'Selecione um dia no calendário'}
            </h3>
            {selectedList.length === 0 ? (
              <p className="text-sm text-plum-200/60">{selected ? 'Nenhum agendamento neste dia. 💜' : 'Os dias com agendamentos ficam destacados.'}</p>
            ) : (
              <ul className="space-y-3">
                {selectedList.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map((a) => (
                  <li key={a.id} className="rounded-2xl border border-white/10 p-4 text-sm">
                    <AppointmentRow a={a} busyId={busyId} setStatus={setStatus} remove={remove} setEditing={setEditing} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.length === 0 && <p className="glass rounded-2xl p-6 text-sm text-plum-200/60">Nenhum agendamento encontrado.</p>}
          {filtered.map((a) => (
            <li key={a.id} className="glass rounded-2xl p-4 text-sm">
              <AppointmentRow a={a} busyId={busyId} setStatus={setStatus} remove={remove} setEditing={setEditing} showDate />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <form onSubmit={saveReschedule} className="glass rounded-2xl p-5 mt-4 max-w-md">
          <h4 className="font-serif text-lg text-lavender-soft mb-3">Remarcar: {editing.client_name}</h4>
          <div className="flex gap-3">
            <input type="date" name="date" required defaultValue={editing.appointment_date} className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-lavender/70" />
            <input type="time" name="time" required defaultValue={editing.appointment_time.slice(0, 5)} step={900} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-lavender/70" />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-plum-200/70 hover:text-lavender transition">Cancelar</button>
            <button type="submit" className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-5 py-1.5 text-xs text-white hover:brightness-110 transition">Salvar nova data</button>
          </div>
        </form>
      )}
    </div>
  );
}

function AppointmentRow({ a, busyId, setStatus, remove, setEditing, showDate }) {
  const st = STATUS[a.status] ?? STATUS.pending;
  const dur = a.services?.duration_minutes ?? 60;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-lavender-soft">{a.client_name}</p>
          <p className="text-xs text-plum-200/70">
            {showDate ? `${fmtBR(a.appointment_date)} · ` : ''}{a.appointment_time.slice(0, 5)} · {dur} min · {a.services?.name ?? 'Serviço removido'}
          </p>
          {a.notes && <p className="mt-1 text-xs text-plum-200/60 italic">“{a.notes}”</p>}
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] ${st.cls}`}>{st.label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={`https://wa.me/55${a.client_whatsapp.replace(/\D/g, '')}`}
          target="_blank" rel="noreferrer"
          className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition"
        >
          WhatsApp
        </a>
        {a.status === 'pending' && (
          <>
            <button disabled={busyId === a.id} onClick={() => setStatus(a.id, 'confirmed')} className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/30 transition disabled:opacity-50">Aprovar</button>
            <button disabled={busyId === a.id} onClick={() => setStatus(a.id, 'cancelled')} className="rounded-full bg-red-500/15 border border-red-400/40 px-3 py-1 text-[11px] text-red-200 hover:bg-red-500/25 transition disabled:opacity-50">Recusar</button>
          </>
        )}
        {a.status === 'confirmed' && (
          <>
            <button disabled={busyId === a.id} onClick={() => setStatus(a.id, 'completed')} className="rounded-full border border-sky-400/40 px-3 py-1 text-[11px] text-sky-200 hover:bg-sky-500/10 transition disabled:opacity-50">Concluir</button>
            <button disabled={busyId === a.id} onClick={() => setStatus(a.id, 'cancelled')} className="rounded-full bg-red-500/15 border border-red-400/40 px-3 py-1 text-[11px] text-red-200 hover:bg-red-500/25 transition disabled:opacity-50">Cancelar</button>
          </>
        )}
        {a.status !== 'cancelled' && (
          <button disabled={busyId === a.id} onClick={() => setEditing(a)} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition disabled:opacity-50">Remarcar</button>
        )}
        <button disabled={busyId === a.id} onClick={() => remove(a.id)} className="ml-auto text-[11px] text-red-300/60 hover:text-red-300 transition disabled:opacity-50">Excluir</button>
      </div>
    </div>
  );
}
