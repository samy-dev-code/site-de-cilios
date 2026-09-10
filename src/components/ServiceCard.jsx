import { useState } from 'react';
import TiltCard from './TiltCard';

const brl = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;

export default function ServiceCard({ service, onSchedule }) {
  const s = service ?? {};
  const hasPromo = s.promotional_price != null && Number(s.promotional_price) < Number(s.price);
  const categoryName = s.categories?.name ?? null;
  const canSchedule = typeof onSchedule === 'function';
  const [choiceOpen, setChoiceOpen] = useState(false);

  // Manutenção válida = vinculada e ativa (não arquivada)
  const m = s.maintenance_service;
  const hasMaintenance = !!(m && m.id && m.active !== false && m.archived !== false);
  const mHasPromo = hasMaintenance && m.promotional_price != null && Number(m.promotional_price) < Number(m.price);

  const handleClick = () => {
    if (hasMaintenance) {
      setChoiceOpen(true);
      return;
    }
    onSchedule(s);
  };

  const scheduleWith = (svc) => {
    setChoiceOpen(false);
    onSchedule(svc);
  };

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
            <button
              onClick={() => onSchedule(s)}
              className="btn-lux mt-5 w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-plum-600/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-lavender/60"
            >
              Agendar serviço
            </button>
          )}

          {/* Modal de escolha: serviço normal ou manutenção cadastrada */}
          {choiceOpen && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-plum-950/85 backdrop-blur-sm p-4"
              onClick={() => setChoiceOpen(false)}
            >
              <div
                className="w-full max-w-[260px] text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs text-plum-200/70 mb-3">O que você deseja?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => scheduleWith(s)}
                    className="btn-lux w-full rounded-full bg-gradient-to-r from-plum-700 to-plum-500 py-2.5 text-xs font-medium text-white transition hover:brightness-110"
                  >
                    Fazer este serviço
                  </button>
                  <button
                    onClick={() => scheduleWith(m)}
                    className="btn-lux w-full rounded-full border border-lavender/40 bg-white/5 py-2.5 text-xs font-medium text-lavender-soft transition hover:bg-white/10"
                  >
                    Fazer manutenção
                  </button>
                </div>
                {hasMaintenance && (
                  <p className="mt-2 text-[0.65rem] text-plum-300/60">
                    Manutenção: {brl(m.promotional_price ?? m.price)} · {m.duration_minutes} min
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
    </TiltCard>
  );
}
