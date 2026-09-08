import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import AgendaTab from '../components/admin/AgendaTab';
import ServicesTab from '../components/admin/ServicesTab';
import BannersTab from '../components/admin/BannersTab';
import HoursTab from '../components/admin/HoursTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import PromotionsTab from '../components/admin/PromotionsTab';
import CouponsTab from '../components/admin/CouponsTab';
import HistoryTab from '../components/admin/HistoryTab';
import DashboardTab from '../components/admin/DashboardTab';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/servicos', label: 'Serviços' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/promocoes', label: 'Promoções' },
  { to: '/admin/cupons', label: 'Cupons' },
  { to: '/admin/agendamentos', label: 'Agendamentos' },
  { to: '/admin/banners', label: 'Banners' },
  { to: '/admin/horarios', label: 'Horários' },
  { to: '/admin/historico', label: 'Histórico' },
  { to: '/admin/configuracoes', label: 'Configurações' },
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError('E-mail ou senha incorretos. Tente novamente.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8 animate-fade-up">
        <p className="text-center text-xs uppercase tracking-[0.35em] text-lavender/70">Painel exclusivo</p>
        <img src="/logo-mari-lash.jpeg" alt="Mari Lash VIP" className="mx-auto mt-4 h-20 w-20 rounded-full object-cover ring-2 ring-lavender/30" />
        <h1 className="mt-2 text-center font-serif text-4xl text-gradient">Mari Lash Designer</h1>
        <p className="mt-2 text-center text-sm text-plum-200/70">Entre com suas credenciais para gerenciar o estúdio.</p>
        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">E-mail</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Senha</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
            />
          </div>
        </div>
        {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        <button
          type="submit" disabled={loading}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-plum-600 to-plum-400 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar ✦'}
        </button>
        <Link to="/" className="mt-6 block text-center text-xs text-plum-300/60 hover:text-lavender transition">← Voltar ao site</Link>
      </form>
    </div>
  );
}

function SettingsTab() {
  const EDITABLE = [
    { key: 'business_name', label: 'Nome da empresa', placeholder: 'Mari Lash Designer' },
    { key: 'whatsapp_number', label: 'WhatsApp comercial (só números, com DDI+DDD)', placeholder: '5514998792169' },
    { key: 'instagram', label: 'Instagram (@usuário)', placeholder: 'marilashdesigner' },
    { key: 'address', label: 'Endereço do estúdio', placeholder: 'Rua, número — Bairro, Cidade' },
    { key: 'pix_key', label: 'Chave PIX', placeholder: 'chave@pix.com.br' },
    { key: 'pix_holder_name', label: 'Nome no PIX', placeholder: 'MARI LASH DESIGNER' },
    { key: 'pix_city', label: 'Cidade do PIX', placeholder: 'BAURU' },
  ];
  const [values, setValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from('settings').select('key, value');
    if (err) {
      setError(err.message);
    } else {
      setValues(Object.fromEntries(EDITABLE.map((f) => [f.key, data?.find((r) => r.key === f.key)?.value ?? ''])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const rows = EDITABLE.map((f) => ({ key: f.key, value: values[f.key] ?? '' }));
    const { error: err } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (err) setError(err.message);
    else setSaved(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="glass rounded-3xl p-8 space-y-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />)}
      </div>
    );
  }

  if (error && !values) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-sm text-red-200">Erro ao carregar configurações: {error}</p>
        <button onClick={load} className="mt-4 rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender hover:bg-lavender/10 transition">Tentar novamente</button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="glass rounded-3xl p-6 sm:p-8 space-y-5">
      <div>
        <h3 className="font-serif text-xl text-lavender-soft">Configurações</h3>
        <p className="mt-1 text-sm text-plum-200/70">Informações gerais do estúdio usadas pelo site e pelo fluxo de agendamento.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {EDITABLE.map((f) => (
          <div key={f.key} className={f.key === 'address' ? 'sm:col-span-2' : ''}>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">{f.label}</label>
            <input
              value={values[f.key] ?? ''}
              onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setSaved(false); }}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
            />
          </div>
        ))}
      </div>
      {saved && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">Configurações salvas! ✦</div>}
      {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      <button
        type="submit" disabled={saving}
        className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110 disabled:opacity-60"
      >
        {saving ? 'Salvando…' : 'Salvar configurações'}
      </button>
    </form>
  );
}

export default function AdminPage() {
  const { pathname } = useLocation();
  const [session, setSession] = useState(undefined); // undefined = carregando
  const [auditTick, setAuditTick] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) window.scrollTo({ top: 0 });
  }, [pathname, session]);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" />
      </div>
    );
  }
  if (!session) return <Login />;

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-lavender/70">Painel administrativo</p>
          <div className="flex items-center gap-3">
            <img src="/logo-mari-lash.jpeg" alt="Mari Lash VIP" className="h-11 w-11 rounded-full object-cover ring-2 ring-lavender/30 shadow-lg shadow-plum-600/30" />
            <h1 className="font-serif text-3xl text-gradient">Mari Lash Designer</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-full border border-white/10 px-4 py-2 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition">Ver site</Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-red-400/30 px-4 py-2 text-xs text-red-200/90 hover:bg-red-500/10 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {NAV.map((t) => {
          const active = t.end ? pathname === '/admin' : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`rounded-full px-4 sm:px-5 py-2 text-sm transition ${active ? 'bg-gradient-to-r from-plum-600 to-plum-400 text-white shadow-lg shadow-plum-600/30' : 'border border-white/10 text-plum-200/80 hover:border-lavender/50 hover:text-lavender'}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <main key={pathname} className="mt-8 animate-fade-up">
        <Routes>
          <Route index element={<DashboardTab key={auditTick} />} />
          <Route path="servicos" element={<ServicesTab onAudit={() => setAuditTick((t) => t + 1)} />} />
          <Route path="servicos/historico" element={<Navigate to="/admin/historico" replace />} />
          <Route path="categorias" element={<CategoriesTab />} />
          <Route path="promocoes" element={<PromotionsTab onAudit={() => setAuditTick((t) => t + 1)} />} />
          <Route path="cupons" element={<CouponsTab onAudit={() => setAuditTick((t) => t + 1)} />} />
          <Route path="agendamentos" element={<AgendaTab />} />
          <Route path="agenda" element={<Navigate to="/admin/agendamentos" replace />} />
          <Route path="banners" element={<BannersTab />} />
          <Route path="horarios" element={<HoursTab />} />
          <Route path="historico" element={<HistoryTab />} />
          <Route path="configuracoes" element={<SettingsTab />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
