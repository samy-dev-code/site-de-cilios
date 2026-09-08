import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';

const asArray = (v) => (Array.isArray(v) ? v : []);
const brl = (n) => (n == null ? '' : `R$ ${Number(n).toFixed(2).replace('.', ',')}`);
const fmtDT = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
};

function Card({ label, value, hint, icon }) {
  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-widest text-lavender/70">{label}</p>
        <span className="text-lg opacity-70">{icon}</span>
      </div>
      <p className="mt-2 font-serif text-3xl text-lavender-soft">{value}</p>
      {hint && <p className="mt-1 text-xs text-plum-200/60">{hint}</p>}
    </div>
  );
}

export default function DashboardTab() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svc, cats, appts, logs, hist] = await Promise.all([
        supabase.from('services').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('appointments').select('id, service_id, appointment_date, status, created_at'),
        supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(8),
        supabase.from('service_price_history').select('*, services(name)').order('created_at', { ascending: false }).limit(6),
      ]);
      if (svc.error) throw svc.error;
      setServices(asArray(svc.data));
      setCategories(asArray(cats.data));
      setAppointments(asArray(appts.data));
      setAudit(asArray(logs.data));
      setPriceHistory(asArray(hist.data));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const svc = asArray(services);
    const upcoming = asArray(appointments).filter((a) => a.appointment_date >= new Date().toISOString().slice(0, 10));
    return {
      active: svc.filter((s) => s.active && !s.archived).length,
      total: svc.length,
      featured: svc.filter((s) => s.featured).length,
      archived: svc.filter((s) => s.archived).length,
      upcoming: upcoming.length,
      pending: asArray(appointments).filter((a) => a.status === 'pending').length,
      cats: asArray(categories).filter((c) => c.active).length,
    };
  }, [services, categories, appointments]);

  const topServices = useMemo(() => {
    const counts = {};
    asArray(appointments).forEach((a) => { if (a.service_id) counts[a.service_id] = (counts[a.service_id] ?? 0) + 1; });
    return asArray(services)
      .map((s) => ({ name: s.name, count: counts[s.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [services, appointments]);

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card label="Serviços ativos" value={stats.active} hint={`de ${stats.total} cadastrados`} icon="✦" />
        <Card label="Agendamentos futuros" value={stats.upcoming} hint={stats.pending ? `${stats.pending} pendente(s)` : 'em dia'} icon="📅" />
        <Card label="Destaques na home" value={stats.featured} icon="★" />
        <Card label="Categorias ativas" value={stats.cats} icon="🏷️" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-serif text-lg text-lavender-soft">Serviços mais agendados</h3>
          <ul className="mt-3 space-y-2">
            {topServices.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm text-plum-200/85">
                <span>{s.name}</span>
                <span className="rounded-full bg-lavender/10 px-2.5 py-0.5 text-xs text-lavender">{s.count}</span>
              </li>
            ))}
            {topServices.every((s) => s.count === 0) && topServices.length > 0 && (
              <li className="text-xs text-plum-200/50">Ainda sem agendamentos registrados.</li>
            )}
            {topServices.length === 0 && <li className="text-xs text-plum-200/50">Cadastre serviços para ver estatísticas.</li>}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-serif text-lg text-lavender-soft">Últimas alterações</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="text-plum-200/80">
                <span className="text-lavender">{a.user_email?.split('@')[0] ?? 'admin'}</span> {a.action} — <span className="text-plum-200/60">{a.entity_name ?? a.entity}</span>
                <span className="block text-[10px] text-plum-300/40">{fmtDT(a.created_at)}</span>
              </li>
            ))}
            {audit.length === 0 && <li className="text-xs text-plum-200/50">Nenhuma alteração registrada.</li>}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-serif text-lg text-lavender-soft">Reajustes recentes de preço</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {priceHistory.map((h) => (
              <li key={h.id} className="text-plum-200/80">
                {h.services?.name ?? '—'}: <span className="line-through opacity-50">{brl(h.old_price)}</span> → <span className="text-emerald-300">{brl(h.new_price)}</span>
                <span className="block text-[10px] text-plum-300/40">{fmtDT(h.created_at)}</span>
              </li>
            ))}
            {priceHistory.length === 0 && <li className="text-xs text-plum-200/50">Nenhuma alteração de preço ainda.</li>}
          </ul>
          <Link to="/admin/historico" className="mt-3 inline-block text-xs text-lavender hover:underline">Ver histórico completo →</Link>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-serif text-lg text-lavender-soft">Status do sistema</h3>
          <ul className="mt-3 space-y-2 text-sm text-plum-200/80">
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Banco de dados conectado</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Autenticação ativa</li>
            <li className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${stats.archived ? 'bg-amber-400' : 'bg-emerald-400'}`} /> {stats.archived} serviço(s) arquivado(s)</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/admin/servicos" className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-4 py-2 text-xs text-white shadow-lg shadow-plum-600/25 hover:brightness-110 transition">Gerenciar serviços</Link>
            <Link to="/admin/categorias" className="rounded-full border border-white/10 px-4 py-2 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition">Categorias</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
