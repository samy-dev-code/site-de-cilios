import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Reveal } from '../components/Reveal';
import ServiceCard from '../components/ServiceCard';
import BookingModal, { BookingErrorBoundary } from '../components/BookingModal';

const asArray = (value) => (Array.isArray(value) ? value : []);

function Loader() {
  return (
    <div className="flex justify-center py-16">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-plum-500/30 border-t-plum-400" />
    </div>
  );
}

export default function AllServicesPage() {
  const services = useFetch('services', {
    columns: '*, categories(name, slug), maintenance_service:maintenance_service_id(id, name, price, promotional_price, duration_minutes, active, archived)',
    filters: [['active', 'eq', true], ['archived', 'eq', false]],
    order: { col: 'display_order' },
  });
  const categories = useFetch('categories', { filters: [['active', 'eq', true]], order: { col: 'display_order' } });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [presetService, setPresetService] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const allServices = asArray(services.data);
  const filteredServices = useMemo(
    () => (categoryFilter ? allServices.filter((s) => s.categories?.slug === categoryFilter) : allServices),
    [allServices, categoryFilter]
  );
  const activeCategories = asArray(categories.data).filter((c) =>
    allServices.some((s) => s.categories?.slug === c.slug)
  );

  const scheduleService = (svc, asMaintenance = false) => {
    setPresetService(svc ? { ...svc, _asMaintenance: !!asMaintenance } : null);
    setScheduleOpen(true);
  };

  useEffect(() => {
    if (!scheduleOpen) return;
    const onKey = (e) => e.key === 'Escape' && setScheduleOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scheduleOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-ambient min-h-screen overflow-x-clip">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-plum-500/15 bg-[#050308]/85 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl'
            : 'border-b border-transparent bg-[#050308]/45 backdrop-blur-md'
        }`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-3" aria-label="Mari Lash Designer — início">
            <img
              src="/logo-mari-lash.jpeg"
              alt=""
              className="h-10 w-10 rounded-full object-cover ring-1 ring-plum-400/40 shadow-lg shadow-plum-600/30"
            />
            <span className="font-serif text-xl sm:text-2xl text-gradient">Mari Lash Designer</span>
          </Link>
          <Link
            to="/"
            className="rounded-full border border-plum-500/25 bg-plum-900/30 px-5 py-2 text-sm text-plum-200 transition hover:border-plum-400/50 hover:text-plum-300"
          >
            ← Voltar ao início
          </Link>
        </nav>
      </header>

      {/* Cabeçalho da página */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="glow-radial absolute left-1/2 top-0 h-[40vh] w-[90vw] -translate-x-1/2" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 pt-16 pb-10 text-center">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.35em] text-plum-300/80">Catálogo completo</p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl text-gradient">Todos os nossos serviços</h1>
            <div className="divider-fade mt-6 mx-auto max-w-xs" />
            {!services.loading && !services.error && (
              <p className="mt-4 text-sm text-plum-200/60">
                {allServices.length} {allServices.length === 1 ? 'serviço disponível' : 'serviços disponíveis'} para você ✦
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* Filtro por categoria */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
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
      </div>

      {/* Lista de serviços */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        {services.loading ? (
          <Loader />
        ) : services.error ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-red-200">Não conseguimos carregar os serviços agora.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender hover:bg-lavender/10 transition"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredServices.length === 0 ? (
          <p className="glass rounded-2xl p-8 text-center text-sm text-plum-200/70">
            Nenhum serviço {categoryFilter ? 'nesta categoria' : 'disponível'} no momento. 💜
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredServices.map((s) => (
              <ServiceCard key={s.id} service={s} onSchedule={scheduleService} />
            ))}
          </div>
        )}
      </section>

      {scheduleOpen && (
        <BookingErrorBoundary onClose={() => { setScheduleOpen(false); setPresetService(null); }}>
          <BookingModal
            services={services.data}
            loading={services.loading}
            error={services.error}
            presetService={presetService}
            onClose={() => { setScheduleOpen(false); setPresetService(null); }}
          />
        </BookingErrorBoundary>
      )}
    </div>
  );
}
