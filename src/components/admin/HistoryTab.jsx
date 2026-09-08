import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import MaintenanceModal from './MaintenanceModal';

const asArray = (v) => (Array.isArray(v) ? v : []);
const brl = (n) => (n == null ? '—' : `R$ ${Number(n).toFixed(2).replace('.', ',')}`);
const fmtDT = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};
const fmtDate = (d) => (d ? String(d).split('-').reverse().join('/') : '—');
const fmtTime = (t) => (t ? String(t).slice(0, 5) : '—');

const STATUS_LABEL = {
  pending: 'Pendente', confirmed: 'Confirmado', in_progress: 'Em andamento',
  completed: 'Concluído', cancelled: 'Cancelado', rescheduled: 'Reagendado',
};
const STATUS_CLS = {
  pending: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  confirmed: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  in_progress: 'border-violet-400/40 bg-violet-500/10 text-violet-200',
  completed: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  cancelled: 'border-red-400/40 bg-red-500/10 text-red-200',
  rescheduled: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200',
};

const SUBTABS = [
  { key: 'clients', label: 'Histórico das clientes' },
  { key: 'prices', label: 'Alterações de preços' },
];

export default function HistoryTab() {
  const [sub, setSub] = useState('clients');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SUBTABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`rounded-full px-4 py-2 text-sm transition ${sub === t.key ? 'bg-gradient-to-r from-plum-600 to-plum-400 text-white shadow-lg shadow-plum-600/30' : 'border border-white/10 text-plum-200/80 hover:border-lavender/50 hover:text-lavender'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {sub === 'clients' ? <ClientHistory /> : <PriceHistory />}
    </div>
  );
}

/* ================= HISTÓRICO DAS CLIENTES ================= */

function ClientHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [histories, setHistories] = useState({});
  const [relatedMap, setRelatedMap] = useState({});
  const [maintaining, setMaintaining] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('appointments')
      .select('*, services(name, duration_minutes), promotions(name), related_appointment_id, related:appointments!related_appointment_id(id, appointment_date, appointment_time, services(name))')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(500);
    if (err) {
      console.error('ClientHistory/load:', err.message);
      setError('Não foi possível carregar o histórico das clientes.');
      setRows([]);
    } else {
      setRows(asArray(data));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = asArray(rows);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => (r.client_name ?? '').toLowerCase().includes(q) || (r.client_whatsapp ?? '').includes(q));
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (from) list = list.filter((r) => r.appointment_date >= from);
    if (to) list = list.filter((r) => r.appointment_date <= to);
    return list;
  }, [rows, search, statusFilter, from, to]);

  async function openDetails(id) {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (!next || histories[id]) return;
    const { data, error: err } = await supabase
      .from('appointment_history')
      .select('*')
      .eq('appointment_id', id)
      .order('created_at', { ascending: true });
    if (err) {
      console.error('ClientHistory/history:', err.message);
      setHistories((h) => ({ ...h, [id]: [] }));
    } else {
      setHistories((h) => ({ ...h, [id]: asArray(data) }));
    }
  }

  const selCls = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-lavender/70 transition';

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5 flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Cliente / WhatsApp</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone" className={selCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selCls}>
            <option value="all">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selCls} />
        </div>
        {(search || statusFilter !== 'all' || from || to) && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setFrom(''); setTo(''); }} className="rounded-full border border-white/10 px-4 py-2.5 text-xs text-plum-200/70 hover:text-lavender transition">
            Limpar filtros
          </button>
        )}
      </div>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
      {msg && (
        <p className={`rounded-xl border px-4 py-2.5 text-sm ${msg.kind === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>
          {msg.text}
        </p>
      )}

      <ul className="space-y-3">
        {filtered.map((a) => (
          <li key={a.id} className={`glass rounded-2xl p-4 text-sm ${a.status === 'cancelled' ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-lavender-soft">{a.client_name} <span className="text-xs text-plum-200/50">{a.client_whatsapp}</span></p>
                <p className="text-xs text-plum-200/70 mt-0.5">
                  {fmtDate(a.appointment_date)} às {fmtTime(a.appointment_time)} · {a.services?.duration_minutes ?? 60} min · {a.promotions ? `Promoção: ${a.promotions.name}` : a.services?.name ?? 'Serviço removido'}
                </p>
                <p className="text-xs text-plum-200/70">{brl(a.final_amount)}</p>
                {a.notes && <p className="mt-1 text-xs text-plum-200/60 italic">“{a.notes}”</p>}
                {a.rescheduled_from_date && (
                  <p className="mt-1 text-xs text-fuchsia-200/80">
                    Reagendado de {fmtDate(a.rescheduled_from_date)} às {fmtTime(a.rescheduled_from_time)}
                  </p>
                )}
                {a.related && (
                  <p className="mt-1 text-xs text-lavender/80">
                    ✦ Manutenção do atendimento de {fmtDate(a.related.appointment_date)} ({a.related.services?.name ?? 'serviço'})
                  </p>
                )}
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${STATUS_CLS[a.status] ?? ''}`}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => openDetails(a.id)} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition">
                {expanded === a.id ? 'Ocultar detalhes' : 'Ver detalhes'}
              </button>
              {a.status === 'completed' && (
                <button onClick={() => setMaintaining(a)} className="rounded-full border border-lavender/40 bg-lavender/10 px-3 py-1 text-[11px] text-lavender hover:bg-lavender/20 transition">
                  Agendar manutenção
                </button>
              )}
            </div>
            {expanded === a.id && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-widest text-plum-300/60 mb-2">Linha do tempo</p>
                {(histories[a.id] ?? []).length === 0 ? (
                  <p className="text-xs text-plum-200/60">Nenhuma alteração registrada.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(histories[a.id] ?? []).map((h) => (
                      <li key={h.id} className="text-xs text-plum-200/80">
                        <span className="text-plum-300/60">{fmtDT(h.created_at)}</span> — {h.description}{h.changed_by ? ` (por ${h.changed_by})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="glass rounded-3xl p-10 text-center text-sm text-plum-200/60">
            {rows.length === 0 ? 'Nenhum atendimento registrado ainda.' : 'Nenhum registro encontrado com os filtros atuais.'}
          </li>
        )}
      </ul>

      {maintaining && (
        <MaintenanceModal
          original={maintaining}
          onClose={() => setMaintaining(null)}
          onDone={(ok) => {
            setMaintaining(null);
            setMsg(ok
              ? { kind: 'ok', text: 'Manutenção agendada com sucesso! Ela já aparece no histórico da cliente.' }
              : { kind: 'error', text: 'Não foi possível agendar a manutenção.' });
            if (ok) load();
          }}
        />
      )}
    </div>
  );
}

/* ================= HISTÓRICO DE PREÇOS ================= */

function PriceHistory() {
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [hist, svc] = await Promise.all([
      supabase.from('service_price_history').select('*, services(name)').order('created_at', { ascending: false }).limit(300),
      supabase.from('services').select('id, name').order('name'),
    ]);
    if (hist.error) {
      console.error('PriceHistory/load:', hist.error.message);
      setError(hist.error.message);
    } else setError(null);
    setRows(asArray(hist.data));
    setServices(asArray(svc.data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = asArray(rows);
    if (serviceFilter !== 'all') list = list.filter((r) => r.service_id === serviceFilter);
    if (from) list = list.filter((r) => new Date(r.created_at) >= new Date(`${from}T00:00:00`));
    if (to) list = list.filter((r) => new Date(r.created_at) <= new Date(`${to}T23:59:59`));
    return list;
  }, [rows, serviceFilter, from, to]);

  const selCls = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-lavender/70 transition';

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-5 flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Serviço</label>
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={selCls}>
            <option value="all">Todos os serviços</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selCls} />
        </div>
        {(serviceFilter !== 'all' || from || to) && (
          <button onClick={() => { setServiceFilter('all'); setFrom(''); setTo(''); }} className="rounded-full border border-white/10 px-4 py-2.5 text-xs text-plum-200/70 hover:text-lavender transition">
            Limpar filtros
          </button>
        )}
      </div>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}

      {/* Tabela no desktop, cards no mobile */}
      <div className="glass rounded-3xl hidden md:block overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-widest text-lavender/70">
              <th className="px-5 py-4">Serviço</th>
              <th className="px-5 py-4">Preço anterior</th>
              <th className="px-5 py-4">Novo preço</th>
              <th className="px-5 py-4">Promoção</th>
              <th className="px-5 py-4">Data</th>
              <th className="px-5 py-4">Alterado por</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const changed = Number(r.old_price) !== Number(r.new_price);
              return (
                <tr key={r.id} className="border-b border-white/5 last:border-0 text-plum-200/85">
                  <td className="px-5 py-3.5 font-medium text-lavender-soft">{r.services?.name ?? 'Serviço removido'}</td>
                  <td className={`px-5 py-3.5 ${changed ? 'line-through opacity-50' : ''}`}>{brl(r.old_price)}</td>
                  <td className="px-5 py-3.5 font-semibold text-emerald-300">{brl(r.new_price)}</td>
                  <td className="px-5 py-3.5 text-xs text-plum-200/60">
                    {r.new_promotional_price != null ? `${brl(r.old_promotional_price)} → ${brl(r.new_promotional_price)}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs">{fmtDT(r.created_at)}</td>
                  <td className="px-5 py-3.5 text-xs text-plum-200/60">{r.user_email ?? 'administrador'}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-plum-200/60">
                {rows.length === 0 ? 'Nenhuma alteração de preço registrada ainda.' : 'Nenhum registro encontrado com os filtros atuais.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-3">
        {filtered.map((r) => {
          const changed = Number(r.old_price) !== Number(r.new_price);
          return (
            <li key={r.id} className="glass rounded-2xl p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-lavender-soft">{r.services?.name ?? 'Serviço removido'}</p>
                <p className="text-sm">
                  {changed && <span className="line-through opacity-50 mr-1.5">{brl(r.old_price)}</span>}
                  <span className="font-semibold text-emerald-300">{brl(r.new_price)}</span>
                </p>
              </div>
              {r.new_promotional_price != null && (
                <p className="mt-0.5 text-xs text-plum-200/60">Promoção: {brl(r.old_promotional_price)} → {brl(r.new_promotional_price)}</p>
              )}
              <p className="mt-1 text-[11px] text-plum-300/50">
                {fmtDT(r.created_at)} · {r.user_email ?? 'administrador'}
              </p>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="glass rounded-2xl p-10 text-center text-sm text-plum-200/60">
            {rows.length === 0 ? 'Nenhuma alteração de preço registrada ainda.' : 'Nenhum registro encontrado com os filtros atuais.'}
          </li>
        )}
      </ul>
    </div>
  );
}
