/** Galerias "antes/depois" com placeholders em SVG enquanto não há upload de fotos. */
const items = [
  { label: 'Volume Russo', hint: 'Antes / Depois' },
  { label: 'Fio a Fio', hint: 'Antes / Depois' },
  { label: 'Mega Volume', hint: 'Antes / Depois' },
  { label: 'Fox Eyes', hint: 'Antes / Depois' },
  { label: 'Brasileiro', hint: 'Antes / Depois' },
  { label: 'Lash Lifting', hint: 'Antes / Depois' },
];

function EyeSketch() {
  return (
    <svg viewBox="0 0 160 80" className="h-24 w-40 text-lavender/50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10 50 Q55 5 100 40 Q120 56 150 34" />
      <path d="M18 58 Q60 20 102 50 Q122 64 144 48" opacity="0.55" />
      <path d="M28 64 Q66 34 106 60" opacity="0.3" />
      <circle cx="78" cy="46" r="12" opacity="0.35" />
    </svg>
  );
}

export default function Gallery() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((it) => (
        <div key={it.label} className="glass glass-hover rounded-2xl p-6 flex flex-col items-center text-center">
          <EyeSketch />
          <p className="mt-4 font-serif text-xl text-lavender-soft">{it.label}</p>
          <p className="text-xs uppercase tracking-widest text-plum-300/60 mt-1">{it.hint}</p>
        </div>
      ))}
    </div>
  );
}
