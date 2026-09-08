import { useMemo, useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useSettings, asArray } from '../hooks/useSettings';
import ServiceCard from '../components/ServiceCard';
import TestimonialCard from '../components/TestimonialCard';
import Gallery from '../components/Gallery';
import SiteFooter from '../components/SiteFooter';
import { InstagramIcon } from '../components/icons';

/**
 * Página de divulgação (/divulgacao) — molduras 16:9 com as seções REAIS do site,
 * prontas para screenshot em alta resolução. Não altera o site público.
 */

function Frame({ label, children, dark = true }) {
  return (
    <div className="mx-auto mb-20 w-full max-w-5xl">
      <p className="mb-3 text-xs uppercase tracking-[0.35em] text-plum-300/60">{label}</p>
      <div
        className="overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-plum-500/20"
        style={{ aspectRatio: '16 / 9' }}
      >
        {children}
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { href: '#servicos', label: 'Serviços' },
  { href: '#galeria', label: 'Galeria' },
  { href: '#depoimentos', label: 'Depoimentos' },
];

function MiniHeader({ onSchedule }) {
  return (
    <header className="flex items-center justify-between border-b border-plum-500/15 bg-[#050308] px-8 py-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <img
          src="/logo-mari-lash.jpeg"
          alt=""
          className="h-11 w-11 rounded-full object-cover ring-1 ring-plum-400/40 shadow-lg shadow-plum-600/30"
        />
        <span className="font-serif text-2xl text-gradient">Mari Lash Designer</span>
      </div>
      <div className="flex items-center gap-10 text-sm tracking-wide text-plum-200/90">
        {NAV_LINKS.map((l) => (
          <span key={l.href}>{l.label}</span>
        ))}
        <span className="rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-plum-600/30">
          Agendar
        </span>
      </div>
    </header>
  );
}

const CATEGORIES = ['Todos', 'Volume Brasileiro', 'Volume Russo', 'Lash Lifting', 'Manutenção'];

export default function MediaKitPage() {
  const services = useFetch('services', {
    columns: '*, categories(name, slug)',
    filters: [['active', 'eq', true], ['archived', 'eq', false]],
    order: { col: 'display_order' },
  });
  const testimonials = useFetch('testimonials', { filters: [['approved', 'eq', true]], order: { col: 'sort_order' } });
  const { settings } = useSettings();
  const instagram = settings.instagram;
  const [cat, setCat] = useState('Todos');

  const all = asArray(services.data);
  const featured = useMemo(() => all.filter((s) => s.featured).slice(0, 4), [all]);
  const visible = useMemo(
    () => (cat === 'Todos' ? all : all.filter((s) => s.categories?.name === cat)).slice(0, 4),
    [all, cat]
  );

  const Hero = (
    <div className="bg-ambient relative flex h-full w-full flex-col overflow-hidden">
      <div aria-hidden className="bg-grid-tech pointer-events-none absolute inset-0" />
      <div aria-hidden className="glow-radial pointer-events-none absolute left-1/2 top-1/3 h-[60vh] w-[90vw] -translate-x-1/2" />
      <MiniHeader />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="inline-block rounded-full border border-plum-400/30 bg-plum-600/10 px-5 py-1.5 text-xs uppercase tracking-[0.3em] text-plum-300">
          Realce o seu olhar ✦
        </span>
        <h1 className="mt-6 font-serif text-7xl text-gradient drop-shadow-[0_0_30px_rgba(168,85,247,0.35)]">
          Realce o seu olhar
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-xl text-plum-200/80">
          Extensão de cílios com técnica refinada, atendimento exclusivo e um ambiente
          pensado para você se sentir única.
        </p>
        <div className="mt-10 flex items-center gap-5">
          <span className="rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-9 py-4 text-lg font-medium text-white shadow-xl shadow-plum-600/40">
            Agendar meu horário ✦
          </span>
          <span className="rounded-full border border-plum-500/25 bg-plum-900/30 px-9 py-4 text-lg font-medium text-plum-200">
            Ver serviços
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050308] px-6 py-16">
      <div className="mb-16 text-center">
        <h1 className="font-serif text-4xl text-gradient">Kit de divulgação — Mari Lash Designer</h1>
        <p className="mt-3 text-sm text-plum-200/60">
          Tire screenshots de cada moldura (use zoom do navegador para alta resolução) e publique nas redes sociais.
        </p>
      </div>

      <Frame label="1 · Hero">{Hero}</Frame>

      <Frame label="2 · Menu e navegação">
        <div className="flex h-full w-full flex-col bg-ambient">
          <MiniHeader />
          <div className="flex flex-1 flex-col gap-1 px-10 py-8">
            {NAV_LINKS.map((l) => (
              <div
                key={l.href}
                className="rounded-xl px-4 py-4 text-lg text-plum-200/90"
              >
                {l.label}
              </div>
            ))}
            <span className="mt-3 w-fit rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-7 py-3 text-base font-medium text-white shadow-lg shadow-plum-600/30">
              Agendar meu horário
            </span>
          </div>
        </div>
      </Frame>

      <Frame label="3 · Serviços em destaque">
        <div className="bg-ambient h-full w-full overflow-hidden p-10">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-plum-300/80">Nossos serviços</p>
            <h2 className="mt-3 font-serif text-5xl text-gradient">Técnicas de cílios</h2>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-plum-300/70">✦ Mais procurados</p>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-5">
            {(featured.length ? featured : all).slice(0, 4).map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      </Frame>

      <Frame label="4 · Cards e categorias">
        <div className="bg-ambient h-full w-full overflow-hidden p-10">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-plum-300/80">Catálogo</p>
            <h2 className="mt-3 font-serif text-5xl text-gradient">Escolha sua técnica</h2>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.15em] transition ${
                  cat === c
                    ? 'bg-gradient-to-r from-plum-600 to-lavender text-white shadow-lg shadow-plum-600/30'
                    : 'border border-plum-500/25 text-plum-200/80'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-4 gap-5">
            {visible.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      </Frame>

      <Frame label="5 · Galeria antes & depois">
        <div className="bg-ambient h-full w-full overflow-hidden p-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-plum-300/80">Portfólio</p>
            <h2 className="mt-3 font-serif text-5xl text-gradient">Antes & Depois</h2>
          </div>
          <div className="mt-6 overflow-hidden">
            <Gallery />
          </div>
        </div>
      </Frame>

      <Frame label="6 · Depoimentos">
        <div className="bg-ambient h-full w-full overflow-hidden p-10">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-plum-300/80">O que dizem</p>
            <h2 className="mt-3 font-serif text-5xl text-gradient">Depoimentos</h2>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-5">
            {asArray(testimonials.data).slice(0, 3).map((t) => (
              <TestimonialCard key={t.id} item={t} />
            ))}
          </div>
        </div>
      </Frame>

      <Frame label="7 · CTA final + rodapé">
        <div className="flex h-full w-full flex-col bg-ambient">
          <div className="flex-1 px-10 py-8">
            <div className="glass rounded-3xl px-8 py-8 text-center">
              <h2 className="font-serif text-4xl text-gradient">Pronta para o seu novo olhar?</h2>
              <p className="mt-3 text-plum-200/75">Agende agora e garanta o seu horário com a Mari.</p>
              <div className="mt-6 flex items-center justify-center gap-4">
                <span className="rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-10 py-3.5 font-medium text-white shadow-xl shadow-plum-600/40">
                  Quero agendar
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-plum-500/25 bg-plum-900/30 px-6 py-2.5 text-sm text-plum-200">
                  <InstagramIcon className="h-4 w-4" />
                  Siga @{(instagram || '').replace(/^@/, '') || 'nossa equipe'} no Instagram
                </span>
              </div>
            </div>
          </div>
          <div className="pointer-events-none scale-[0.62] origin-top -mt-6">
            <SiteFooter />
          </div>
        </div>
      </Frame>

      <Frame label="8 · Página completa (composição)" dark>
        <div className="bg-ambient h-full w-full overflow-hidden">
          <div className="scale-[0.32] origin-top-left" style={{ width: '312%', height: '312%' }}>
            {Hero}
          </div>
        </div>
      </Frame>
    </div>
  );
}
