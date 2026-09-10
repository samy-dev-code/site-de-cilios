import TiltCard from './TiltCard';

const brl = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;

export default function ServiceCard({ service, onSchedule }) {
  const s = service ?? {};
  const hasPromo = s.promotional_price != null && Number(s.promotional_price) < Number(s.price);
  const categoryName = s.categories?.name ?? null;
  const canSchedule = typeof onSchedule === 'function';

  // Manutenção embutida no próprio registro do serviço (dados reais do Supabase)
  const hasMaintenance = !!(s.maintenance_enabled && s.maintenance_price != null);
  const maintenancePrice = s.maintenance_promotional_price ?? s.maintenance_price;
  const maintenanceDuration = s.maintenance_duration_minutes || 60;

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
          {s.image_url ? (
            <img
              src={s.image_url}
              alt={s.name ?? 'Serviço'}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <svg viewBox="0 0 120 60" className="h-20 w-36 text-plum-400/60 transition-colors duration-500 group-hover:text-plum-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 40 Q30 8 55 30 Q75 46 110 26" />
              <path d="M15 50 Q35 22 60 42 Q80 56 105 40" opacity="0.6" />
            </svg>
          )}
          {/* Selos sobre a imagem */}
          {s.featured && (
            <span className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-plum-600 to-lavender px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-plum-600/40">
              ✦ Destaque
            </span>
          )}
          {hasPromo && (
            <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-emerald-300 ring-1 ring-emerald-400/40">
              Promoção
            </span>
          )}
          {/* Brilho inferior na imagem */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <div className="relative p-6 flex flex-col flex-1">
          {categoryName && (
            <p className="text-[0.6rem] uppercase tracking-[0.25em] text-plum-300/70">{categoryName}</p>
          )}
          <h3 className="mt-1 font-serif text-2xl text-lavender-soft">{s.name ?? 'Serviço'}</h3>
          <p className="mt-2 text-sm text-plum-200/75 leading-relaxed flex-1">{s.description}</p>
          <div className="divider-fade my-4" />
          <div className="flex items-end justify-between">
            <div>
              {hasPromo ? (
                <>
                  <span className="block text-xs text-plum-300/60 line-through">{brl(s.price)}</span>
                  <span className="font-serif text-2xl text-gradient">{brl(s.promotional_price)}</span>
                </>
              ) : (
                <span className="font-serif text-2xl text-gradient">{brl(s.price)}</span>
              )}
            </div>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-plum-300/70">
              {s.duration_minutes} min
            </span>
          </div>
          {canSchedule && (
            <div className="mt-5 space-y-2">
              <button
                onClick={() => onSchedule(s, false)}
                className="btn-lux w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-plum-600/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-lavender/60"
              >
                Agendar serviço
              </button>
              {hasMaintenance && (
                <div>
                  <button
                    onClick={() => onSchedule(s, true)}
                    className="btn-lux w-full rounded-full border border-lavender/40 bg-white/5 py-2.5 text-sm font-medium text-lavender-soft transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lavender/60"
                  >
                    Agendar manutenção
                  </button>
                  <p className="mt-1.5 text-center text-[0.65rem] text-plum-300/60">
                    {brl(maintenancePrice)} · {maintenanceDuration} min
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    </TiltCard>
  );
}
