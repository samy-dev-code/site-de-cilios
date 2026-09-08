import { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage.jsx';
import { useFetch } from './hooks/useFetch';
import { supabase } from './integrations/supabase/client';
import BannerCarousel from './components/BannerCarousel';
import ServiceCard from './components/ServiceCard';
import TestimonialCard from './components/TestimonialCard';
import Gallery from './components/Gallery';
import BookingModal from './components/BookingModal';
import Scene3DBackground from './components/Scene3DBackground';
import { Reveal, Parallax } from './components/Reveal';

function Loader() {
  return (
    <div className="flex justify-center py-16">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" />
    </div>
  );
}

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div className="text-center mb-10">
        <Reveal>
        <p className="text-xs uppercase tracking-[0.35em] text-lavender/70">{eyebrow}</p>
        <h2 className="mt-3 font-serif text-4xl sm:text-5xl text-gradient">{title}</h2>
        <div className="divider-fade mt-6 mx-auto max-w-xs" />
        </Reveal>
      </div>
      <Reveal delay={0.15}>
      {children}
      </Reveal>
    </section>
  );
}

function SiteHome() {
  const banners = useFetch('banners', { filters: [['active', 'eq', true]], order: { col: 'sort_order' } });
  const services = useFetch('services', { filters: [['active', 'eq', true]], order: { col: 'sort_order' } });
  const testimonials = useFetch('testimonials', { filters: [['approved', 'eq', true]], order: { col: 'sort_order' } });
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    const ch = supabase
      .channel('banners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => window.location.reload())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // Fecha o modal de agendamento com ESC e garante tela responsiva
  useEffect(() => {
    if (!scheduleOpen) return;
    const onKey = (e) => e.key === 'Escape' && setScheduleOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scheduleOpen]);

  return (
    <div className="min-h-screen bg-[#0a0308]">
      <Scene3DBackground />
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass border-x-0 border-t-0">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="#" className="flex items-center gap-3">
            <img src="/logo-mari-lash.jpeg" alt="Mari Lash VIP" className="h-10 w-10 rounded-full object-cover ring-1 ring-lavender/40 shadow-lg shadow-plum-600/30" />
            <span className="font-serif text-2xl text-gradient">Mari Lash Designer</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm tracking-wide text-plum-200/90">
            <a href="#servicos" className="hover:text-lavender transition-colors">Serviços</a>
            <a href="#galeria" className="hover:text-lavender transition-colors">Galeria</a>
            <a href="#depoimentos" className="hover:text-lavender transition-colors">Depoimentos</a>
          </div>
          <button
            onClick={() => setScheduleOpen(true)}
            className="btn-lux rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-plum-600/30 transition hover:brightness-110"
          >
            Agendar
          </button>
        </nav>
      </header>

      {/* Hero + Banners */}
      <Reveal>
        <BannerCarousel banners={banners.data} />
      </Reveal>
      <Parallax strength={24}>
      <div className="relative mx-auto max-w-4xl px-4 -mt-16 pb-8 text-center z-10">
        <span className="inline-block rounded-full border border-lavender/30 bg-lavender/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-lavender animate-fade-up">
          High-end lash studio
        </span>
        <h1 className="mt-5 font-serif text-5xl sm:text-6xl md:text-7xl text-gradient animate-fade-up">
          Realce o seu olhar
        </h1>
        <p className="mt-4 text-lg text-plum-200/85 max-w-2xl mx-auto animate-fade-up">
          Extensão de cílios com técnica refinada, atendimento exclusivo e um ambiente
          pensado para você se sentir única.
        </p>
        <Reveal delay={0.1}>
          <img
            src="/banner-promocional.jpeg"
            alt="Promoção — Traga sua amiga! Cílios lindos com desconto especial"
            className="mt-8 mx-auto w-full max-w-3xl rounded-2xl border border-lavender/20 shadow-2xl shadow-plum-600/25"
          />
        </Reveal>
        <button
          onClick={() => setScheduleOpen(true)}
          className="btn-lux mt-8 rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-8 py-3.5 text-base font-medium text-white shadow-xl shadow-plum-600/40 transition hover:brightness-110 hover:scale-[1.02]"
        >
          Agendar meu horário ✦
        </button>
      </div>
      </Parallax>

      {/* Serviços */}
      <Section id="servicos" eyebrow="Nossos serviços" title="Técnicas de cílios">
        {services.loading ? (
          <Loader />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.data.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
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
            {testimonials.data.map((t) => <TestimonialCard key={t.id} item={t} />)}
          </div>
        )}
      </Section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="glass rounded-3xl px-8 py-14 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-gradient">Pronta para o seu novo olhar?</h2>
          <p className="mt-3 text-plum-200/85">Agende agora e garanta o seu horário com a Mari.</p>
          <button
            onClick={() => setScheduleOpen(true)}
            className="mt-8 rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-10 py-4 font-medium text-white shadow-xl shadow-plum-600/40 transition hover:brightness-110"
          >
            Quero agendar
          </button>
        </div>
      </section>

      <footer className="border-t border-lavender/10 py-8 text-center text-sm text-plum-300/60">
        © {new Date().getFullYear()} Mari Lash Designer · Todos os direitos reservados
      </footer>

      {scheduleOpen && (
        <BookingModal
          services={services.data}
          loading={services.loading}
          error={services.error}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="*" element={<SiteHome />} />
    </Routes>
  );
}
