function Stars({ rating }) {
  return (
    <div className="flex gap-0.5 text-plum-400" role="img" aria-label={`Avaliação: ${rating ?? 5} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`h-4 w-4 ${i < (rating ?? 5) ? 'fill-current' : 'fill-white/10'}`}>
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialCard({ item }) {
  const name = item?.client_name ?? 'Cliente';
  return (
    <figure className="glass glass-hover rounded-[20px] p-6 flex flex-col relative overflow-hidden group">
      {/* Glow discreto no canto ao hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.16), transparent 70%)' }}
      />
      <Stars rating={item?.rating} />
      <blockquote className="relative mt-4 flex-1 text-plum-200/90 italic leading-relaxed">
        “{item?.message}”
      </blockquote>
      <figcaption className="relative mt-5 flex items-center gap-3">
        {item?.photo_url ? (
          <img
            src={item.photo_url}
            alt={name}
            loading="lazy"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-plum-400/40"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-plum-700 to-plum-900 font-serif text-lg text-lavender-soft ring-1 ring-plum-400/30">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-sm tracking-wide text-lavender-soft">{name}</span>
      </figcaption>
    </figure>
  );
}
