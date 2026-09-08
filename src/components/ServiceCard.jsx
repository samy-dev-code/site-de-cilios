import TiltCard from './TiltCard';

export default function ServiceCard({ service }) {
  return (
    <TiltCard className="h-full">
      <article className="glass glass-hover rounded-[20px] overflow-hidden flex flex-col h-full relative group">
        {/* Iluminação roxa acompanhando o cursor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(circle at var(--glow-x,50%) var(--glow-y,50%), rgba(168,85,247,0.20), transparent 62%)' }}
        />
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-plum-800 via-plum-900 to-black flex items-center justify-center">
          {service?.image_url ? (
            <img
              src={service.image_url}
              alt={service?.name ?? 'Serviço'}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <svg viewBox="0 0 120 60" className="h-20 w-36 text-plum-400/60 transition-colors duration-500 group-hover:text-plum-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 40 Q30 8 55 30 Q75 46 110 26" />
              <path d="M15 50 Q35 22 60 42 Q80 56 105 40" opacity="0.6" />
            </svg>
          )}
          {/* Brilho inferior na imagem */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <div className="relative p-6 flex flex-col flex-1">
          <h3 className="font-serif text-2xl text-lavender-soft">{service?.name ?? 'Serviço'}</h3>
          <p className="mt-2 text-sm text-plum-200/75 leading-relaxed flex-1">{service?.description}</p>
          <div className="divider-fade my-4" />
          <div className="flex items-end justify-between">
            <span className="font-serif text-2xl text-gradient">
              R$ {Number(service?.price ?? 0).toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-plum-300/70">
              {service?.duration_minutes} min
            </span>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
