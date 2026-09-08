import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * HERO de banners promocionais — full-width (100vw), sem container limitante.
 * Cada banner controla: object-fit, object-position, altura, posição do conteúdo,
 * tamanho do título, overlay e imagens separadas para desktop/mobile.
 */

// Alturas por modo: [mobile, desktop]
const HEIGHTS = {
  compact: ['h-[55vw] max-h-[420px] min-h-[280px] sm:h-[40vh] md:h-[52vh] lg:h-[60vh]'],
  default: ['h-[70vw] max-h-[560px] min-h-[320px] sm:h-[52vh] md:h-[62vh] lg:h-[72vh]'],
  tall: ['h-[85vw] max-h-[720px] min-h-[380px] sm:h-[64vh] md:h-[76vh] lg:h-[86vh]'],
  fullscreen: ['h-[92vw] max-h-[820px] min-h-[420px] sm:h-[76vh] md:h-[86vh] lg:h-[100vh]'],
};

const FITS = ['cover', 'contain'];
const POS = {
  center: 'object-center',
  top: 'object-top',
  bottom: 'object-bottom',
  left: 'object-left',
  right: 'object-right',
  'top left': 'object-top-left',
  'top right': 'object-top-right',
  'bottom left': 'object-bottom-left',
  'bottom right': 'object-bottom-right',
};

const CONTENT_POS = {
  center: 'items-center justify-center text-center px-8',
  left: 'items-center justify-start text-left px-8 sm:px-16 lg:px-24',
  right: 'items-center justify-end text-right px-8 sm:px-16 lg:px-24',
  'bottom-left': 'items-end justify-start text-left px-8 pb-16 sm:px-16 lg:px-24 sm:pb-20',
  'bottom-center': 'items-end justify-center text-center px-8 pb-16 sm:pb-20',
  'bottom-right': 'items-end justify-end text-right px-8 pb-16 sm:px-16 lg:px-24 sm:pb-20',
};

const TITLE_SIZES = {
  normal: 'text-3xl sm:text-5xl lg:text-6xl',
  large: 'text-4xl sm:text-6xl lg:text-7xl',
  huge: 'text-5xl sm:text-7xl lg:text-8xl',
};

const slideHeight = (mode) => HEIGHTS[mode] || HEIGHTS.default;
const fitClass = (fit) => (FITS.includes(fit) ? fit : 'cover');
const posClass = (p) => POS[p] || 'object-center';

function BannerSlide({ banner, active, isFirst }) {
  const desktop = banner.desktop_image_url || banner.image_url;
  const mobile = banner.mobile_image_url || desktop;
  const fit = fitClass(banner.object_fit);
  const cpos = CONTENT_POS[banner.content_position] || CONTENT_POS.center;
  const overlay = Math.min(85, Math.max(0, Number(banner.overlay_opacity ?? 55))) / 100;

  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 transition-opacity duration-700 ease-out ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {desktop ? (
        <picture>
          {mobile && mobile !== desktop && <source media="(max-width: 767px)" srcSet={mobile} />}
          <img
            src={desktop}
            alt={banner.title ?? 'Banner promocional'}
            loading={isFirst && active ? 'eager' : 'lazy'}
            decoding="async"
            fetchpriority={isFirst ? 'high' : undefined}
            className={`h-full w-full ${fit === 'contain' ? 'object-contain bg-[#0a0510]' : 'object-cover'} ${posClass(banner.object_position)}`}
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          />
        </picture>
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#2a1235] via-[#160a1f] to-black" />
      )}

      {/* Gradiente de legibilidade configurável — não esconde a foto */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#08030d] via-[#08030d]/50 to-transparent"
        style={{ opacity: overlay }}
      />
      {banner.content_position === 'right' && (
        <div className="absolute inset-0 bg-gradient-to-l from-[#08030d]/70 to-transparent" style={{ opacity: overlay }} />
      )}
      {banner.content_position === 'left' && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#08030d]/70 to-transparent" style={{ opacity: overlay }} />
      )}

      {/* Conteúdo centralizado em container interno — o banner continua full-width */}
      <div className={`absolute inset-0 flex flex-col ${cpos}`}>
        <div className="max-w-2xl">
          {banner.featured && (
            <span className="mb-4 inline-block rounded-full border border-amber-300/40 bg-amber-400/10 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-amber-200 backdrop-blur-sm">
              ✦ Destaque
            </span>
          )}
          {banner.title && (
            <h2 className={`font-serif text-gradient leading-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)] ${TITLE_SIZES[banner.title_size] || TITLE_SIZES.normal}`}>
              {banner.title}
            </h2>
          )}
          {banner.subtitle && (
            <p className="mt-4 text-sm text-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.95)] sm:mt-5 sm:text-lg">
              {banner.subtitle}
            </p>
          )}
          {banner.button_text && (
            <a
              href={banner.button_url || '#'}
              target={/^https?:/i.test(banner.button_url || '') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="btn-lux mt-7 inline-block rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-8 py-3.5 text-sm font-medium text-white shadow-xl shadow-plum-600/40 transition hover:brightness-110 sm:text-base"
            >
              {banner.button_text}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BannerCarousel({ banners }) {
  const slides = useMemo(
    () => banners.filter((b) => b.desktop_image_url || b.image_url || b.title || b.subtitle),
    [banners]
  );
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef(null);
  const touchX = useRef(null);

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  // Auto-play respeitando a duração de cada banner
  useEffect(() => {
    if (count <= 1 || paused) return;
    const duration = Math.max(2000, Number(slides[index]?.duration) || 6000);
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), duration);
    return () => clearTimeout(t);
  }, [index, count, paused, slides]);

  const interact = useCallback((goto) => {
    if (goto === undefined) return;
    setIndex(goto);
    setPaused(true);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 8000);
  }, []);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) interact((index + (dx < 0 ? 1 : -1) + count) % count);
    touchX.current = null;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 8000);
  };

  if (count === 0) return null;
  const current = slides[index];

  return (
    <section
      className="relative left-1/2 w-screen -translate-x-1/2"
      aria-roledescription="carousel"
      aria-label="Promoções"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Faixa luminosa premium acima do banner */}
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-plum-400/40 to-transparent" />

      <div className={`group relative w-full overflow-hidden ${slideHeight(current?.height_mode)}`}>
        {slides.map((b, i) => (
          <BannerSlide key={b.id} banner={b} active={i === index} isFirst={i === 0} />
        ))}

        {count > 1 && (
          <>
            <button
              onClick={() => interact((index - 1 + count) % count)}
              aria-label="Promoção anterior"
              className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-2xl text-lavender backdrop-blur-md transition hover:bg-plum-600/50 md:opacity-0 md:group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              onClick={() => interact((index + 1) % count)}
              aria-label="Próxima promoção"
              className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-2xl text-lavender backdrop-blur-md transition hover:bg-plum-600/50 md:opacity-0 md:group-hover:opacity-100"
            >
              ›
            </button>
            <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => interact(i)}
                  aria-label={`Ir para promoção ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-10 bg-lavender shadow-[0_0_8px_rgba(201,167,232,0.7)]' : 'w-3 bg-white/30 hover:bg-white/60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
