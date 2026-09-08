import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import AgendaTab from '../components/admin/AgendaTab';
import ServicesTab from '../components/admin/ServicesTab';
import BannersTab from '../components/admin/BannersTab';
import HoursTab from '../components/admin/HoursTab';

const AuthCtx = createContext(null);
export const useAdmin = () => useContext(AuthCtx);

const TABS = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'services', label: 'Serviços' },
  { id: 'banners', label: 'Banners' },
  { id: 'hours', label: 'Horários' },
];

function Login({ onLogin }) {
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
    else onLogin();
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

function Nav({ tab, setTab }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`rounded-full px-5 py-2 text-sm transition ${tab === t.id ? 'bg-gradient-to-r from-plum-600 to-plum-400 text-white shadow-lg shadow-plum-600/30' : 'border border-white/10 text-plum-200/80 hover:border-lavender/50 hover:text-lavender'}`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tab = TABS.some((t) => pathname.endsWith(t.id)) ? TABS.find((t) => pathname.endsWith(t.id)).id : 'agenda';
  const [session, setSession] = useState(undefined); // undefined = carregando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" />
      </div>
    );
  }
  if (!session) return <Login onLogin={() => navigate('/admin/agenda')} />;

  return (
    <AuthCtx.Provider value={{ session }}>
      <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
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
        <Nav tab={tab} setTab={(t) => navigate(`/admin/${t}`)} />
        <main className="mt-8 animate-fade-up">
          {tab === 'agenda' && <AgendaTab />}
          {tab === 'services' && <ServicesTab />}
          {tab === 'banners' && <BannersTab />}
          {tab === 'hours' && <HoursTab />}
        </main>
      </div>
    </AuthCtx.Provider>
  );
}
