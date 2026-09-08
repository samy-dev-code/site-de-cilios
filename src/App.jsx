import { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsOfUse from './pages/TermsOfUse.jsx';
import SiteFooter from './components/SiteFooter';
import WhatsAppFloat from './components/WhatsAppFloat';
import { useFetch } from './hooks/useFetch';
import { supabase } from './integrations/supabase/client';
import BannerCarousel from './components/BannerCarousel';
import ServiceCard from './components/ServiceCard';
import TestimonialCard from './components/TestimonialCard';
import Gallery from './components/Gallery';
import BookingModal from './components/BookingModal';
import Scene3DBackground from './components/Scene3DBackground';
import LashHero3D from './components/LashHero3D';
import { Reveal, Parallax } from './components/Reveal';
import { useSettings, instagramUrl } from './hooks/useSettings';
import { InstagramIcon } from './components/icons';

const NAV_LINKS = [
  { href: '#servicos', label: 'Serviços' },
  { href: '#galeria', label: 'Galeria' },
  { href: '#depoimentos', label: 'Depoimentos' },
];

// Normalização segura: qualquer dado do Supabase usado com .map/.filter vira array
const asArray = (value) => (Array.isArray(value) ? value : []);

function Loader() {
  return (
    <div className="flex justify-center py-16">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-plum-500/30 border-t-plum-400" />
    </div>
  );
}

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div className="text-center mb-10">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.35em] text-plum-300/80">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl text-gradient">{title}</h2>
          <div className="divider-fade mt-6 mx-auto max-w-xs" />
        </Reveal>
      </div>
      <Reveal delay={0.15}>{children}</Reveal>
    </section>
  );
}

function SiteHeader({ onSchedule, scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-plum-500/15 bg-[#050308]/85 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl'
          : 'border-b border-transparent bg-[#050308]/45 backdrop-blur-md'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <a href="#" className="flex items-center gap-3" aria-label="Mari Lash Designer — início">
          <img
            src="/logo-mari-lash.jpeg"
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-1 ring-plum-400/40 shadow-lg shadow-plum-600/30"
          />
          <span className="font-serif text-xl sm:text-2xl text-gradient">Mari Lash Designer</span>
        </a>

        {/* Navegação desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm tracking-wide text-plum-200/90">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-plum-300">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSchedule}
            className="btn-lux hidden sm:inline-flex rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-plum-600/30"
          >
            Agendar
          </button>

          {/* Hamburger mobile */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-plum-500/20 bg-plum-900/40 text-plum-200 transition hover:border-plum-400/40"
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-px w-5 bg-current transition-all duration-300 ${menuOpen ? 'top-1/2 rotate-45' : 'top-0.5'}`}
              />
              <span
                className={`absolute left-0 top-1/2 block h-px w-5 -translate-y-1/2 bg-current transition-all duration-200 ${menuOpen ? 'opacity-0' : 'opacity-100'}`}
              />
              <span
                className={`absolute left-0 block h-px w-5 bg-current transition-all duration-300 ${menuOpen ? 'top-1/2 -rotate-45' : 'bottom-0.5'}`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-72 border-t border-plum-500/10' : 'max-h-0'}`}
      >
        <div className="flex flex-col gap-1 bg-[#050308]/95 px-6 py-4 backdrop-blur-xl">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-3 text-plum-200/90 transition hover:bg-plum-800/40 hover:text-plum-300"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => {
              setMenuOpen(false);
              onSchedule();
            }}
            className="btn-lux mt-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/30"
          >
            Agendar meu horário
          </button>
        </div>
      </div>
    </header>
  );
}

function SiteHome() {
  const banners = useFetch('banners', { filters: [['active', 'eq', true]], order: { col: 'sort_order' } });
  const services = useFetch('services', {
    columns: '*, categories(name, slug)',
    filters: [['active', 'eq', true], ['archived', 'eq', false]],
    order: { col: 'display_order' },
  });
  const categories = useFetch('categories', { filters: [['active', 'eq', true]], order: { col: 'display_order' } });
  const testimonials = useFetch('testimonials', { filters: [['approved', 'eq', true]], order: { col: 'sort_order' } });
  const { settings } = useSettings();
  const instagram = settings.instagram;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [presetService, setPresetService] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Pré-seleciona o serviço escolhido no catálogo ("Agendar" do card)
  const scheduleService = (svc) => {
    setPresetService(svc ?? null);
    setScheduleOpen(true);
  };

  useEffect(() => {
    const ch = supabase
      .channel('public-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => window.location.reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => window.location.reload())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // Filtro de categoria escolhido pelo visitante
  const [categoryFilter, setCategoryFilter] = useState(null);
  const allServices = asArray(services.data);
  const visibleServices = categoryFilter
    ? allServices.filter((s) => s.categories?.slug === categoryFilter)
    : allServices;
  const featured = allServices.filter((s) => s.featured);
  const activeCategories = asArray(categories.data).filter((c) =>
    allServices.some((s) => s.categories?.slug === c.slug)
  );

  // Fecha o modal de agendamento com ESC e garante tela responsiva
  useEffect(() => {
    if (!scheduleOpen) return;
    const onKey = (e) => e.key === 'Escape' && setScheduleOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scheduleOpen]);

  // Header sólido ao rolar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-ambient min-h-screen overflow-x-clip">
      {/* Grid tecnológico sutil no topo */}
      <div aria-hidden className="bg-grid-tech pointer-events-none absolute inset-x-0 top-0 z-0 h-[80vh]" />

      {/* Canvases 3D pausados enquanto o modal está aberto — evita tela preta/travada */}
      {!scheduleOpen && <Scene3DBackground />}

      <SiteHeader onSchedule={() => setScheduleOpen(true)} scrolled={scrolled} />

      {/* Hero — canvas 3D de cílios como peça central */}
      <section className="relative overflow-hidden">
        {!scheduleOpen && <LashHero3D />}
        {/* Iluminação radial roxa */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="glow-radial absolute left-1/2 top-1/4 h-[60vh] w-[90vw] -translate-x-1/2" />
        </div>
        <Parallax strength={24}>
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 sm:py-32 text-center">
            <span className="animate-fade-up inline-block rounded-full border border-plum-400/30 bg-plum-600/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-plum-300">
              High-end lash studio
            </span>
            <h1 className="animate-fade-up mt-5 font-serif text-5xl sm:text-6xl md:text-7xl text-gradient drop-shadow-[0_0_30px_rgba(168,85,247,0.35)]">
              Realce o seu olhar
            </h1>
            <p className="animate-fade-up mx-auto mt-4 max-w-2xl text-lg text-plum-200/80">
              Extensão de cílios com técnica refinada, atendimento exclusivo e um ambiente
              pensado para você se sentir única.
            </p>
            <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setScheduleOpen(true)}
                className="btn-lux rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-8 py-3.5 text-base font-medium text-white shadow-xl shadow-plum-600/40"
              >
                Agendar meu horário ✦
              </button>
              <a
                href="#servicos"
                className="rounded-full border border-plum-500/25 bg-plum-900/30 px-8 py-3.5 text-base font-medium text-plum-200 transition hover:border-plum-400/50 hover:bg-plum-800/40 hover:text-plum-300"
              >
                Ver serviços
              </a>
            </div>
          </div>
        </Parallax>
      </section>

      {/* Banner promocional */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-8">
        <Reveal delay={0.1}>
          <img
            src="/banner-promocional.jpeg"
            alt="Promoção — Traga sua amiga! Cílios lindos com desconto especial"
            loading="lazy"
            className="mx-auto w-full rounded-2xl border border-plum-500/20 shadow-2xl shadow-plum-700/25"
          />
        </Reveal>
      </div>

      {/* Serviços */}
      <Section id="servicos" eyebrow="Nossos serviços" title="Técnicas de cílios">
        {services.loading ? (
          <Loader />
        ) : services.error ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-red-200">Não conseguimos carregar os serviços agora.</p>
            <button onClick={() => window.location.reload()} className="mt-4 rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender hover:bg-lavender/10 transition">Tentar novamente</button>
          </div>
        ) : asArray(services.data).length === 0 ? (
          <p className="glass rounded-2xl p-8 text-center text-sm text-plum-200/70">Nenhum serviço disponível no momento. 💜</p>
        ) : (
          <>
            {/* Área especial de destaques */}
            {featured.length > 0 && (
              <div className="mb-10">
                <p className="mb-4 text-xs uppercase tracking-[0.3em] text-lavender/70 text-center">✦ Mais procurados</p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {featured.map((s) => <ServiceCard key={s.id} service={s} onSchedule={scheduleService} />)}
                </div>
                <div className="divider-fade mt-10 mx-auto max-w-xs" />
              </div>
            )}

            {/* Filtro por categoria */}
            {activeCategories.length > 1 && (
              <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition ${!categoryFilter ? 'bg-gradient-to-r from-plum-600 to-lavender text-white shadow-lg shadow-plum-600/30' : 'border border-plum-500/25 text-plum-200/80 hover:border-plum-400/50 hover:bg-plum-800/40'}`}
                >
                  Todos
                </button>
                {activeCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.slug)}
                    className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition ${categoryFilter === c.slug ? 'bg-gradient-to-r from-plum-600 to-lavender text-white shadow-lg shadow-plum-600/30' : 'border border-plum-500/25 text-plum-200/80 hover:border-plum-400/50 hover:bg-plum-800/40'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {visibleServices.length === 0 ? (
              <p className="glass rounded-2xl p-8 text-center text-sm text-plum-200/70">Nenhum serviço nesta categoria no momento. 💜</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {visibleServices.map((s) => <ServiceCard key={s.id} service={s} onSchedule={scheduleService} />)}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Galeria */}
      <Section id="galeria" eyebrow="Portfólio" title="Antes & Depois">
        {/* Galeria — fotos reais das clientes */}
        <Gallery />
      </Section>

      {/* Depoimentos */}
      <Section id="depoimentos" eyebrow="O que dizem" title="Depoimentos">
        {testimonials.loading ? (
          <Loader />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {asArray(testimonials.data).map((t) => <TestimonialCard key={t.id} item={t} />)}
          </div>
        )}
      </Section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="glass rounded-3xl px-8 py-14 text-center">
          <div aria-hidden className="glow-radial pointer-events-none absolute inset-0" />
          <h2 className="relative font-serif text-3xl sm:text-4xl text-gradient">Pronta para o seu novo olhar?</h2>
          <p className="relative mt-3 text-plum-200/75">Agende agora e garanta o seu horário com a Mari.</p>
          <button
            onClick={() => setScheduleOpen(true)}
            className="btn-lux relative mt-8 rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-10 py-4 font-medium text-white shadow-xl shadow-plum-600/40"
          >
            Quero agendar
          </button>
          <div className="relative mt-6">
            <a
              href={instagramUrl(instagram)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da empresa"
              className="inline-flex items-center gap-2 rounded-full border border-plum-500/25 bg-plum-900/30 px-6 py-2.5 text-sm text-plum-200 transition hover:border-lavender/60 hover:text-lavender"
            >
              <InstagramIcon className="h-4 w-4" />
              Siga @{(instagram || '').replace(/^@/, '') || 'nossa equipe'} no Instagram
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      {scheduleOpen && (
        <BookingModal
          services={services.data}
          loading={services.loading}
          error={services.error}
          presetService={presetService}
          onClose={() => { setScheduleOpen(false); setPresetService(null); }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
      <Route path="/termos-de-uso" element={<TermsOfUse />} />
      <Route path="*" element={<SiteHome />} />
    </Routes>
  );
}
