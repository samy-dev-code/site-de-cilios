import { useEffect, useState } from 'react';

/** Carrossel de banners promocionais gerenciável pelo admin. */
export default function BannerCarousel({ banners }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="relative h-64 sm:h-80 md:h-[26rem] overflow-hidden">
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        >
          {b.image_url ? (
            <img src={b.image_url} alt={b.title ?? 'Banner'} className="h-full w-full object-cover" />
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
        </div>
      ))}

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-lavender' : 'w-3 bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
