import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Carrossel premium de banners promocionais.
 * Recebe apenas banners já publicados (ativos, não arquivados, dentro do período).
 */
export default function BannerCarousel({ banners }) {
  const slides = useMemo(
    () => banners.filter((b) => b.desktop_image_url || b.image_url || b.title || b.subtitle),
    [banners]
  );
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef(null);

  // Troca automática respeitando a duração de cada banner
  useEffect(() => {
    if (count <= 1 || paused) return;
    const duration = Math.max(2000, Number(slides[index]?.duration) || 6000);
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), duration);
    return () => clearTimeout(t);
  }, [index, count, paused, slides]);

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  const interact = useCallback((goto) => {
    setIndex((i) => (goto !== undefined ? goto : (i + 1) % count));
    setPaused(true);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 8000);
  }, [count]);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  // Swipe no mobile
  const touchX = useRef(null);
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) interact(dx < 0 ? undefined : (index - 1 + count) % count);
    touchX.current = null;
  };

  if (count === 0) return null;
  const go = (d) => interact((index + d + count) % count);

  return (
    <section
      className="relative z-10 mx-auto max-w-4xl px-4 pb-10"
      aria-roledescription="carousel"
      aria-label="Promoções"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="group relative h-72 overflow-hidden rounded-3xl border border-plum-500/25 shadow-2xl shadow-plum-700/30 sm:h-96 md:h-[28rem]">
        {slides.map((b, i) => {
          const active = i === index;
          const pos = b.content_position === 'left'
            ? 'items-start text-left'
            : b.content_position === 'right'
              ? 'items-end text-right'
              : 'items-center text-center';
          const desktop = b.desktop_image_url || b.image_url;
          const mobile = b.mobile_image_url || desktop;
          const inner = (
            <>
              {/* Imagem responsiva: mobile usa sua própria versão quando existir */}
              <picture>
                {mobile && mobile !== desktop && <source media="(max-width: 640px)" srcSet={mobile} />}
                <img
                  src={desktop}
                  alt={b.title ?? 'Banner promocional'}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${active ? 'scale-105' : 'scale-100'}`}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0308] via-black/45 to-transparent" />
              <div className={`absolute inset-0 flex flex-col justify-center px-8 sm:px-14 ${pos}`}>
                {b.featured && (
                  <span className="mb-3 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-amber-200 w-fit">
                    ✦ Destaque
                  </span>
                )}
                {b.title && (
                  <h2 className="font-serif text-3xl text-gradient drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-4xl md:text-5xl">
                    {b.title}
                  </h2>
                )}
                {b.subtitle && (
                  <p className="mt-2 max-w-md text-sm text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] sm:text-base">
                    {b.subtitle}
                  </p>
                )}
                {b.button_text && b.button_url && (
                  <a
                    href={b.button_url}
                    target={/^https?:/i.test(b.button_url) ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-5 w-fit rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110"
                  >
                    {b.button_text}
                  </a>
                )}
              </div>
            </>
          );
          return (
            <div
              key={b.id}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              {inner}
            </div>
          );
        })}

        {count > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Promoção anterior"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-xl text-lavender backdrop-blur-md transition hover:bg-plum-600/40 md:opacity-0 md:group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Próxima promoção"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-xl text-lavender backdrop-blur-md transition hover:bg-plum-600/40 md:opacity-0 md:group-hover:opacity-100"
            >
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => interact(i)}
                  aria-label={`Ir para promoção ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-lavender' : 'w-3 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
