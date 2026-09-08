import { useEffect, useState } from 'react';

const items = [
  { src: '/galeria/cliente-1.jpeg', label: 'Volume Russo', hint: 'Resultado natural' },
  { src: '/galeria/cliente-2.jpeg', label: 'Fio a Fio', hint: 'Olhar marcado' },
  { src: '/galeria/cliente-3.jpeg', label: 'Mega Volume', hint: 'Impacto total' },
  { src: '/galeria/cliente-4.jpeg', label: 'Brasileiro', hint: 'Elegância diária' },
];

/* Galeria "Dark Luxury": fotos reais das clientes com zoom no hover e lightbox ao clicar */
export default function Gallery() {
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {items.map((it, i) => (
          <button
            key={it.src}
            onClick={() => setLightbox(i)}
            className="group relative overflow-hidden rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-lavender/60 transition"
            aria-label={`Ver foto de ${it.label}`}
          >
            <img
              src={it.src}
              alt={`Cliente — ${it.label}`}
              loading="lazy"
              className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-left translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
              <p className="font-serif text-lg text-lavender-soft">{it.label}</p>
              <p className="text-[0.65rem] uppercase tracking-[0.25em] text-lavender/70">{it.hint}</p>
            </div>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-hover:ring-lavender/50 transition" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-up"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Fechar"
            className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full glass text-lavender text-xl hover:bg-lavender/20 transition"
          >
            ✕
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + items.length) % items.length); }}
            aria-label="Foto anterior"
            className="absolute left-3 sm:left-8 flex h-11 w-11 items-center justify-center rounded-full glass text-lavender text-2xl hover:bg-lavender/20 transition"
          >
            ‹
          </button>
          <figure className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={items[lightbox].src}
              alt={`Cliente — ${items[lightbox].label}`}
              className="w-full max-h-[78vh] object-contain rounded-2xl border border-lavender/20 shadow-2xl shadow-plum-600/30"
            />
            <figcaption className="mt-4 text-center">
              <p className="font-serif text-2xl text-gradient">{items[lightbox].label}</p>
              <p className="text-xs uppercase tracking-[0.3em] text-plum-300/60 mt-1">
                {lightbox + 1} / {items.length}
              </p>
            </figcaption>
          </figure>
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % items.length); }}
            aria-label="Próxima foto"
            className="absolute right-3 sm:right-8 flex h-11 w-11 items-center justify-center rounded-full glass text-lavender text-2xl hover:bg-lavender/20 transition"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
