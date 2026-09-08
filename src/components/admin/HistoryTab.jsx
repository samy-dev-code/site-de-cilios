import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const asArray = (v) => (Array.isArray(v) ? v : []);
const brl = (n) => (n == null ? '—' : `R$ ${Number(n).toFixed(2).replace('.', ',')}`);
const fmtDT = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};

export default function HistoryTab() {
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
    if (hist.error) setError(hist.error.message); else setError(null);
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

      <div className="glass rounded-3xl overflow-x-auto">
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
    </div>
  );
}
