import { useEffect, useState } from 'react';

/** Carrossel de banners promocionais — primeiro destaque da página inicial. */
export default function BannerCarousel({ banners }) {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;
    setIndex((i) => (i >= count ? 0 : i));
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count]);

  // Sem banners ativos: oculta a seção completamente.
  if (count === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + count) % count);
  const next = () => setIndex((i) => (i + 1) % count);

  return (
    <section
      className="relative h-64 sm:h-80 md:h-[26rem] overflow-hidden group"
      aria-roledescription="carousel"
      aria-label="Banners promocionais"
    >
      {banners.map((b, i) => {
        const inner = (
          <>
            {b.image_url ? (
              <img
                src={b.image_url}
                alt={b.title ?? 'Banner'}
                className="h-full w-full object-cover sm:object-cover object-center"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-plum-900 via-plum-800 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0308] via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              {b.title && (
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gradient animate-fade-up">{b.title}</h2>
              )}
              {b.subtitle && (
                <p className="mt-2 text-plum-200 max-w-lg animate-fade-up">{b.subtitle}</p>
              )}
            </div>
          </>
        );

        return (
          <div
            key={b.id}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {b.link_url ? (
              <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                {inner}
              </a>
            ) : (
              inner
            )}
          </div>
        );
      })}

      {count > 1 && (
        <>
          {/* Setas */}
          <button
            onClick={prev}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full glass text-lavender text-xl transition hover:bg-lavender/20 md:opacity-0 md:group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Próximo banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full glass text-lavender text-xl transition hover:bg-lavender/20 md:opacity-0 md:group-hover:opacity-100"
          >
            ›
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Ir para banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-lavender' : 'w-3 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
