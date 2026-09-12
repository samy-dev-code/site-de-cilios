import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import AgendaTab from '../components/admin/AgendaTab';
import TodayTab from '../components/admin/TodayTab';
import ServicesTab from '../components/admin/ServicesTab';
import BannersTab from '../components/admin/BannersTab';
import HoursTab from '../components/admin/HoursTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import CouponsTab from '../components/admin/CouponsTab';
import HistoryTab from '../components/admin/HistoryTab';
import DashboardTab from '../components/admin/DashboardTab';
import GalleryTab from '../components/admin/GalleryTab';

const NAV = [
  { to: '/admin/hoje', label: 'Hoje' },
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/servicos', label: 'Serviços' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/cupons', label: 'Cupons' },
  { to: '/admin/agendamentos', label: 'Agendamentos' },
  { to: '/admin/banners', label: 'Banners' },
  { to: '/admin/horarios', label: 'Horários' },
  { to: '/admin/galeria', label: 'Galeria' },
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
    { key: 'pix_key', label: 'Chave PIX (e-mail, CPF/CNPJ ou telefone)', placeholder: 'chave@pix.com.br' },
    { key: 'pix_holder_name', label: 'Nome do recebedor no PIX', placeholder: 'MARI LASH DESIGNER' },
    { key: 'pix_city', label: 'Cidade do PIX', placeholder: 'BAURU' },
    { key: 'pix_copia_e_cola', label: 'PIX Copia e Cola (código)', placeholder: '00020126…', textarea: true },
  ];

  async function savePixToggle(next) {
    setPixSaving(true);
    setPixError(null);
    try {
      const { error } = await supabase.from('settings').upsert({ key: 'pix_enabled', value: String(next) });
      if (error) throw error;
      setPixEnabled(next);
    } catch (e) {
      setPixError(e.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setPixSaving(false);
    }
  }

  async function handlePixQrUpload(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setPixError('Selecione um arquivo de imagem para o QR Code.');
      return;
    }
    setPixSaving(true);
    setPixError(null);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `qr-code-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('pix').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('pix').getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) throw new Error('Não foi possível obter a URL pública do QR Code.');
      const { error: dbErr } = await supabase.from('settings').upsert({ key: 'pix_qr_url', value: url });
      if (dbErr) throw dbErr;
      setPixQrUrl(url);
    } catch (e) {
      setPixError(e.message || 'Falha no upload do QR Code. Tente novamente.');
    } finally {
      setPixSaving(false);
    }
  }
  const [values, setValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pixSaving, setPixSaving] = useState(false);
  const [pixError, setPixError] = useState(null);
  const [pixEnabled, setPixEnabled] = useState(true);
  const [pixQrUrl, setPixQrUrl] = useState('');
  const qrFileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from('settings').select('key, value');
    if (err) {
      setError(err.message);
    } else {
      const find = (k) => data?.find((r) => r.key === k)?.value ?? '';
      setValues(Object.fromEntries(EDITABLE.map((f) => [f.key, find(f.key)])));
      setPixEnabled(find('pix_enabled') !== 'false');
      setPixQrUrl(find('pix_qr_url') || '/pix-marilash.png');
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
            {f.textarea ? (
              <textarea
                rows={4}
                value={values[f.key] ?? ''}
                onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setSaved(false); }}
                placeholder={f.placeholder}
                className="w-full break-all rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
              />
            ) : (
            <input
              value={values[f.key] ?? ''}
              onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setSaved(false); }}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
            />
            )}
          </div>
        ))}
      </div>

      {/* Pagamento PIX */}
      <div className="rounded-2xl border border-lavender/20 bg-black/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-serif text-lg text-lavender-soft">Pagamento via PIX</h4>
            <p className="mt-0.5 text-xs text-plum-200/60">Controle o que aparece para a cliente no checkout.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pixEnabled}
            disabled={pixSaving}
            onClick={() => savePixToggle(!pixEnabled)}
            className={`relative h-9 w-14 rounded-full transition ${pixEnabled ? 'bg-gradient-to-r from-plum-500 to-lavender' : 'bg-white/15'} ${pixSaving ? 'opacity-50' : ''}`}
          >
            <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${pixEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <p className={`mt-2 text-xs ${pixEnabled ? 'text-emerald-300' : 'text-plum-200/60'}`}>
          {pixEnabled ? 'PIX ativo — aparece como opção no agendamento.' : 'PIX desativado — a opção fica oculta para as clientes.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {pixQrUrl && (
            <img src={pixQrUrl} alt="QR Code PIX atual" className="h-24 w-24 rounded-xl border border-white/10 bg-white object-contain p-1" />
          )}
          <div>
            <input
              ref={qrFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handlePixQrUpload(e.target.files?.[0]); e.target.value = ''; }}
            />
            <button
              type="button"
              disabled={pixSaving}
              onClick={() => qrFileRef.current?.click()}
              className="rounded-full border border-lavender/40 px-5 py-3 text-xs text-lavender transition hover:bg-lavender/10 disabled:opacity-50"
            >
              {pixSaving ? 'Enviando…' : 'Alterar imagem do QR Code'}
            </button>
            <p className="mt-1 text-[11px] text-plum-200/50">PNG ou JPG do QR Code do seu banco.</p>
          </div>
        </div>
        {pixError && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs text-red-200">{pixError}</p>}
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha o menu mobile ao trocar de página
  useEffect(() => { setMenuOpen(false); }, [pathname]);

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
    <div className="min-h-screen max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 overflow-x-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hambúrguer (mobile) */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-lavender-soft hover:border-lavender/50 transition"
          >
            <span className="sr-only">Abrir menu</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-lavender/70">Painel administrativo</p>
            <div className="flex items-center gap-3">
              <img src="/logo-mari-lash.jpeg" alt="Mari Lash VIP" className="h-11 w-11 rounded-full object-cover ring-2 ring-lavender/30 shadow-lg shadow-plum-600/30" />
              <h1 className="font-serif text-2xl sm:text-3xl text-gradient truncate">Mari Lash Designer</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="rounded-full border border-white/10 px-4 py-2.5 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition">Ver site</Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-red-400/30 px-4 py-2.5 text-xs text-red-200/90 hover:bg-red-500/10 transition"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Navegação desktop */}
      <nav className="hidden lg:flex flex-wrap gap-2">
        {NAV.map((t) => {
          const active = t.end ? pathname === '/admin' : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`rounded-full px-5 py-2 text-sm transition ${active ? 'bg-gradient-to-r from-plum-600 to-plum-400 text-white shadow-lg shadow-plum-600/30' : 'border border-white/10 text-plum-200/80 hover:border-lavender/50 hover:text-lavender'}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
          />
          <nav className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-white/10 bg-[#17101f] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.35em] text-lavender/70">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-plum-200/80 hover:text-lavender transition"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-1.5">
              {NAV.map((t) => {
                const active = t.end ? pathname === '/admin' : pathname.startsWith(t.to);
                return (
                  <li key={t.to}>
                    <Link
                      to={t.to}
                      className={`block rounded-xl px-4 py-3 text-sm transition ${active ? 'bg-gradient-to-r from-plum-600 to-plum-400 text-white shadow-lg shadow-plum-600/30' : 'border border-white/10 text-plum-200/80 hover:border-lavender/50 hover:text-lavender'}`}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}

      <main key={pathname} className="mt-8 animate-fade-up">
        <Routes>
          <Route index element={<DashboardTab key={auditTick} />} />
          <Route path="servicos" element={<ServicesTab onAudit={() => setAuditTick((t) => t + 1)} />} />
          <Route path="servicos/historico" element={<Navigate to="/admin/historico" replace />} />
          <Route path="categorias" element={<CategoriesTab />} />
          <Route path="cupons" element={<CouponsTab onAudit={() => setAuditTick((t) => t + 1)} />} />
          <Route path="hoje" element={<TodayTab />} />
          <Route path="agendamentos" element={<AgendaTab />} />
          <Route path="agenda" element={<Navigate to="/admin/agendamentos" replace />} />
          <Route path="banners" element={<BannersTab />} />
          <Route path="horarios" element={<HoursTab />} />
          <Route path="galeria" element={<GalleryTab />} />
          <Route path="historico" element={<HistoryTab />} />
          <Route path="configuracoes" element={<SettingsTab />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
