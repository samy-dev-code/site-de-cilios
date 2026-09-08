import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

const FALLBACK = [
  { id: 'f1', src: '/galeria/cliente-1.jpeg', label: 'Volume Russo', hint: 'Resultado natural', before_url: '', after_url: '/galeria/cliente-1.jpeg' },
  { id: 'f2', src: '/galeria/cliente-2.jpeg', label: 'Fio a Fio', hint: 'Olhar marcado', before_url: '', after_url: '/galeria/cliente-2.jpeg' },
  { id: 'f3', src: '/galeria/cliente-3.jpeg', label: 'Mega Volume', hint: 'Impacto total', before_url: '', after_url: '/galeria/cliente-3.jpeg' },
  { id: 'f4', src: '/galeria/cliente-4.jpeg', label: 'Brasileiro', hint: 'Elegância diária', before_url: '', after_url: '/galeria/cliente-4.jpeg' },
];

/* Galeria "Dark Luxury": fotos reais das clientes com zoom no hover e lightbox ao clicar */
export default function Gallery() {
  const [items, setItems] = useState(FALLBACK);
  const [lightbox, setLightbox] = useState(null);
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(50);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('id, label, hint, before_url, after_url')
        .eq('active', true)
        .order('position');
      if (mounted && !error && data && data.length > 0) {
        setItems(data.map((r) => ({ ...r, src: r.after_url || r.before_url })));
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, items.length]);

  const open = (i) => { setLightbox(i); setCompare(false); setSplit(50); };
  const hasBefore = lightbox !== null && !!items[lightbox]?.before_url;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {items.map((it, i) => (
          <button
            key={it.id}
            onClick={() => open(i)}
            className="group relative overflow-hidden rounded-2xl border border-plum-500/20 bg-plum-950 focus:outline-none focus:ring-2 focus:ring-plum-400/60 focus:ring-offset-2 focus:ring-offset-void transition-all duration-300 hover:border-plum-400/50 hover:shadow-[0_16px_48px_rgba(109,25,168,0.3)]"
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
            {it.before_url && it.after_url && (
              <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-lavender-soft backdrop-blur-sm">
                Antes & Depois
              </span>
            )}
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
            onClick={(e) => { e.stopPropagation(); open((lightbox - 1 + items.length) % items.length); }}
            aria-label="Foto anterior"
            className="absolute left-3 sm:left-8 flex h-11 w-11 items-center justify-center rounded-full glass text-lavender text-2xl hover:bg-lavender/20 transition"
          >
            ‹
          </button>
          <figure className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            {compare && hasBefore ? (
              <div className="relative w-full max-h-[70vh] overflow-hidden rounded-2xl border border-lavender/20 shadow-2xl shadow-plum-600/30 select-none">
                <img
                  src={items[lightbox].after_url}
                  alt={`Depois — ${items[lightbox].label}`}
                  className="w-full max-h-[70vh] object-contain"
                  draggable="false"
                />
                <img
                  src={items[lightbox].before_url}
                  alt={`Antes — ${items[lightbox].label}`}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                  draggable="false"
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-lavender shadow-[0_0_12px_rgba(196,160,255,0.9)]"
                  style={{ left: `${split}%` }}
                >
                  <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-lavender text-sm backdrop-blur-sm">
                    ↔
                  </span>
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-white/90">Antes</span>
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-white/90">Depois</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={split}
                  onChange={(e) => setSplit(Number(e.target.value))}
                  aria-label="Comparar antes e depois"
                  className="absolute inset-x-0 bottom-3 mx-auto w-[80%] accent-[#c4a0ff]"
                />
              </div>
            ) : (
              <img
                src={items[lightbox].src}
                alt={`Cliente — ${items[lightbox].label}`}
                className="w-full max-h-[78vh] object-contain rounded-2xl border border-lavender/20 shadow-2xl shadow-plum-600/30"
              />
            )}
            <figcaption className="mt-4 text-center">
              <p className="font-serif text-2xl text-gradient">{items[lightbox].label}</p>
              {hasBefore && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCompare((c) => !c); }}
                  className="mt-3 rounded-full border border-lavender/40 px-5 py-2 text-xs text-lavender hover:bg-lavender/10 transition"
                >
                  {compare ? 'Ver só a foto' : 'Comparar antes e depois'}
                </button>
              )}
              <p className="text-xs uppercase tracking-[0.3em] text-plum-300/60 mt-2">
                {lightbox + 1} / {items.length}
              </p>
            </figcaption>
          </figure>
          <button
            onClick={(e) => { e.stopPropagation(); open((lightbox + 1) % items.length); }}
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
