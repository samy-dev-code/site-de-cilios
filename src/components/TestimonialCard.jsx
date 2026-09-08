function Stars({ rating }) {
  return (
    <div className="flex gap-0.5 text-lavender">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`h-4 w-4 ${i < rating ? 'fill-current' : 'fill-white/15'}`}>
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialCard({ item }) {
  return (
    <figure className="glass glass-hover rounded-2xl p-6 flex flex-col">
      <Stars rating={item.rating} />
      <blockquote className="mt-4 flex-1 text-plum-200/90 italic leading-relaxed">
        “{item.message}”
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.client_name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-plum-700/60 font-serif text-lg text-lavender-soft">
            {item.client_name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-sm tracking-wide text-lavender-soft">{item.client_name}</span>
      </figcaption>
    </figure>
  );
}
