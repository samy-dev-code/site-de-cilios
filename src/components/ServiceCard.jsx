import TiltCard from './TiltCard';

export default function ServiceCard({ service }) {
  return (
    <TiltCard className="h-full">
      <article className="glass glass-hover rounded-2xl overflow-hidden flex flex-col h-full relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(circle at var(--glow-x,50%) var(--glow-y,50%), rgba(168,85,247,0.18), transparent 60%)' }}
        />
      <div className="h-44 w-full overflow-hidden bg-gradient-to-br from-plum-800 to-black flex items-center justify-center">
        {service.image_url ? (
          <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 120 60" className="h-20 w-36 text-lavender/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 40 Q30 8 55 30 Q75 46 110 26" />
            <path d="M15 50 Q35 22 60 42 Q80 56 105 40" opacity="0.6" />
          </svg>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-serif text-2xl text-lavender-soft">{service.name}</h3>
        <p className="mt-2 text-sm text-plum-200/80 leading-relaxed flex-1">{service.description}</p>
        <div className="divider-fade my-4" />
        <div className="flex items-center justify-between">
          <span className="font-serif text-2xl text-gradient">
            R$ {Number(service.price).toFixed(2).replace('.', ',')}
          </span>
          <span className="text-xs uppercase tracking-widest text-plum-300/70">
            {service.duration_minutes} min
          </span>
        </div>
      </div>
    </article>
    </TiltCard>
  );
}
