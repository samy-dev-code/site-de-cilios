import { useCallback, useEffect, useRef, useState } from 'react';

const AUTOPLAY_MS = 4500;

/* Carrossel de "Antes & Depois": autoplay em loop, arraste no mobile,
   navegação manual e indicadores. Leve — só CSS transforms, sem 3D/parallax. */
export default function BeforeAfterCarousel({ items }) {
  const count = items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragX = useRef(null); // null = sem drag; número = posição inicial do toque
  const trackRef = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const go = useCallback(
    (dir) => setIndex((i) => (i + dir + count) % count),
    [count]
  );

  // Autoplay em loop
  useEffect(() => {
    if (paused || dragging || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, dragging, count]);

  // Suporte a teclado
  const onKey = useCallback(
    (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    },
    [go]
  );

  const onStart = (clientX) => {
    dragX.current = clientX;
    setDragging(true);
  };

  const onMove = (clientX) => {
    if (dragX.current === null) return;
    setDragOffset(clientX - dragX.current);
  };

  const onEnd = () => {
    if (dragX.current === null) return;
    const threshold = 50;
    if (dragOffset > threshold) setIndex((i) => (i - 1 + count) % count);
    else if (dragOffset < -threshold) setIndex((i) => (i + 1) % count);
    dragX.current = null;
    setDragOffset(0);
    setDragging(false);
  };

  if (count === 0) return null;

  return (
    <div
      className="relative select-none"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Trabalhos de antes e depois"
      tabIndex={0}
      onKeyDown={onKey}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Janela visível */}
      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => { e.preventDefault(); onStart(e.clientX); }}
        onMouseMove={(e) => dragging && onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={() => dragging && onEnd()}
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))`,
            transition: dragging ? 'none' : 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        >
          {items.map((it, i) => (
            <div
              key={it.id}
              className="w-full shrink-0 px-1 sm:px-2"
              aria-hidden={i !== index}
            >
              <article className="glass rounded-2xl overflow-hidden border border-plum-500/20">
                {/* Fotos antes/depois lado a lado — responsivas, sem corte */}
                <div className="grid grid-cols-2">
                  <figure className="relative">
                    <img
                      src={it.before_url}
                      alt={`Antes — ${it.service_name || it.label}`}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      draggable="false"
                      className="aspect-[4/5] sm:aspect-[3/2] w-full object-contain bg-black/40"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-white/90">
                      Antes
                    </span>
                  </figure>
                  <figure className="relative">
                    <img
                      src={it.after_url || it.before_url}
                      alt={`Depois — ${it.service_name || it.label}`}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      draggable="false"
                      className="aspect-[4/5] sm:aspect-[3/2] w-full object-contain bg-black/40"
                    />
                    <span className="absolute right-2 top-2 rounded-full bg-plum-600/80 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-white">
                      Depois
                    </span>
                  </figure>
                </div>
                {/* Legenda */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-left">
                  <div>
                    <p className="font-serif text-lg text-lavender-soft">
                      {it.label || it.service_name}
                    </p>
                    {it.service_name && it.label && it.service_name !== it.label && (
                      <p className="text-sm text-plum-200/70">{it.service_name}</p>
                    )}
                  </div>
                  {it.category && (
                    <span className="rounded-full border border-plum-400/30 bg-plum-600/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-plum-300">
                      {it.category}
                    </span>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>

      {/* Setas de navegação */}
      {count > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full glass text-lavender text-xl hover:bg-lavender/20 transition"
          >
            ‹
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Próximo"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full glass text-lavender text-xl hover:bg-lavender/20 transition"
          >
            ›
          </button>
        </>
      )}

      {/* Indicadores */}
      {count > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => setIndex(i)}
              aria-label={`Ir para o trabalho ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? 'w-8 bg-gradient-to-r from-plum-500 to-lavender shadow-lg shadow-plum-600/40'
                  : 'w-2 bg-plum-500/30 hover:bg-plum-400/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
