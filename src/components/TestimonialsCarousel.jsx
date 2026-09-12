import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import TestimonialCard from './TestimonialCard';

/* ─────────────────────────────────────────────────────────────
   Depoimentos de demonstração (fictícios) — exibidos como
   exemplo enquanto não há depoimentos reais aprovados no banco.
   ───────────────────────────────────────────────────────────── */
export const DEMO_TESTIMONIALS = [
  { id: 'demo-01', client_name: 'Camila R.', rating: 5, message: 'Fiz o gatinho e fiquei linda dms 😍 Amei, Mari! Já marquei até a manutenção.' },
  { id: 'demo-02', client_name: 'Juliana M.', rating: 5, message: 'Meu cílios ficou perfeito, exatamente como eu queria. A Mari arrasa demais!' },
  { id: 'demo-03', client_name: 'Fernanda S.', rating: 5, message: 'Foi minha primeira vez fazendo extensão e simplesmente amei o resultado. Ficou muito delicado.' },
  { id: 'demo-04', client_name: 'Patrícia L.', rating: 5, message: 'Já fiz com a Mari várias vezes e sempre saio apaixonada pelo resultado. Atendimento impecável!' },
  { id: 'demo-05', client_name: 'Larissa T.', rating: 5, message: 'Ficou muito mais lindo do que eu imaginava. Com certeza vou voltar para fazer a manutenção.' },
  { id: 'demo-06', client_name: 'Bianca A.', rating: 5, message: 'O volume brasileiro ficou um sonho 💜 Recebo elogios no olhar todos os dias. Recomendo demais!' },
  { id: 'demo-07', client_name: 'Renata C.', rating: 5, message: 'Ambiente super aconchegante e a Mari é um amor. Saí de lá me sentindo outra pessoa.' },
  { id: 'demo-08', client_name: 'Amanda P.', rating: 5, message: 'Melhor decisão que já tomei! Meu olhar ficou marcante e natural ao mesmo tempo.' },
  { id: 'demo-09', client_name: 'Gabriela O.', rating: 5, message: 'Sou cliente há mais de um ano e não troco por nada. Cuidado e capricho em cada detalhe.' },
  { id: 'demo-10', client_name: 'Vanessa F.', rating: 5, message: 'Amei o atendimento, muito atenciosa e paciente. O resultado superou minhas expectativas ✨' },
  { id: 'demo-11', client_name: 'Thaís N.', rating: 5, message: 'Fiz o volume russo e o efeito é surreal. Leve, confortável e simplesmente lindo.' },
  { id: 'demo-12', client_name: 'Mariana D.', rating: 5, message: 'Minha manutenção está sempre em dia e meus cílios duram muito. Mãos de ouro, Mari! ✦' },
];

const SPEED_PX_PER_SEC = 38;  // velocidade do loop (suave e constante)
const RESUME_DELAY_MS = 1600; // pausa após o gesto, para a inércia do toque terminar

/**
 * Carrossel de depoimentos em loop contínuo e horizontal.
 * - Rolagem automática suave (requestAnimationFrame, velocidade constante)
 * - Emenda invisível: o conteúdo é duplicado e o scroll "reinicia" no meio,
 *   sem espaços vazios e sem precisar clicar
 * - Celular: swipe nativo (a animação pausa durante o gesto e retorna depois)
 * - Desktop: pausa no hover; trackpad horizontal e setas também funcionam
 * - Respeita prefers-reduced-motion (nesse caso, apenas swipe manual)
 */
export default function TestimonialsCarousel({ items, loading = false, error = null }) {
  const hasReal = Array.isArray(items) && items.length > 0;
  const usingDemo = !loading && (!!error || !hasReal);
  const list = useMemo(() => (usingDemo ? DEMO_TESTIMONIALS : items), [usingDemo, items]);
  const showSkeleton = loading && !hasReal;

  const scrollerRef = useRef(null);
  const setRef = useRef(null);
  const [reps, setReps] = useState(1);

  const posRef = useRef(0);
  const hoverRef = useRef(false);
  const holdRef = useRef(false);
  const visibleRef = useRef(true);
  const resumeTimer = useRef(null);

  /* Duplica o conteúdo o bastante para preencher qualquer largura de
     tela — o loop nunca mostra espaço vazio na emenda. */
  useLayoutEffect(() => {
    if (showSkeleton || list.length === 0) return;
    const scroller = scrollerRef.current;
    const setEl = setRef.current;
    if (!scroller || !setEl || typeof ResizeObserver === 'undefined') return;

    const compute = () => {
      const setWidth = setEl.offsetWidth;
      if (setWidth <= 0) return;
      const needed = Math.max(1, Math.ceil((scroller.clientWidth * 1.05) / setWidth));
      setReps((r) => (needed === r ? r : needed));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(setEl);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [list, showSkeleton]);

  /* Loop contínuo: avança o scroll com velocidade constante e reinicia
     no meio da trilha — como as duas metades são idênticas, a emenda é
     invisível e a rolagem nunca "trava" no fim. */
  useEffect(() => {
    if (showSkeleton || list.length === 0) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // só swipe manual

    let raf = 0;
    let last = performance.now();

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 100); // evita "salto" ao voltar de outra aba
      last = now;

      const paused = holdRef.current || hoverRef.current || !visibleRef.current || document.hidden;
      if (paused) {
        posRef.current = scroller.scrollLeft; // acompanha o gesto do usuário
        return;
      }
      const half = scroller.scrollWidth / 2;
      if (half > 0) {
        posRef.current = (((posRef.current + (SPEED_PX_PER_SEC * dt) / 1000) % half) + half) % half;
        scroller.scrollLeft = posRef.current;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [list, showSkeleton]);

  /* Pausa a animação quando o carrossel sai da tela (economia de bateria) */
  useEffect(() => {
    if (showSkeleton || list.length === 0) return;
    const scroller = scrollerRef.current;
    if (!scroller || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry?.isIntersecting ?? true; },
      { rootMargin: '96px' }
    );
    io.observe(scroller);
    return () => io.disconnect();
  }, [list, showSkeleton]);

  /* Limpa o timer ao desmontar */
  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const scheduleResume = () => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { holdRef.current = false; }, RESUME_DELAY_MS);
  };

  if (showSkeleton) {
    return (
      <div className="mx-auto flex max-w-6xl gap-6 px-4" aria-busy="true" aria-label="Carregando depoimentos">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-52 w-full shrink-0 sm:w-[352px]" />
        ))}
      </div>
    );
  }

  if (list.length === 0) return null;

  const copies = Math.max(2, reps * 2);

  return (
    <div>
      {/* Selo discreto: deixa claro que são avaliações de demonstração */}
      {usingDemo && (
        <p className="mb-7 text-center">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-plum-500/20 bg-plum-900/40 px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.25em] text-plum-200/60">
            <span aria-hidden className="text-plum-400/70">✦</span>
            Depoimentos demonstrativos
            <span aria-hidden className="text-plum-400/70">✦</span>
          </span>
        </p>
      )}

      <div
        ref={scrollerRef}
        className="testimonials-marquee marquee-fade select-none py-3"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Depoimentos de clientes"
        tabIndex={0}
        onPointerEnter={() => { hoverRef.current = true; }}
        onPointerLeave={() => { hoverRef.current = false; }}
        onPointerDown={() => { holdRef.current = true; clearTimeout(resumeTimer.current); }}
        onPointerUp={scheduleResume}
        onPointerCancel={scheduleResume}
        onWheel={(e) => {
          if (e.deltaX !== 0) { holdRef.current = true; scheduleResume(); }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { holdRef.current = true; scheduleResume(); }
        }}
      >
        <div className="flex w-max">
          {Array.from({ length: copies }).map((_, c) => (
            <div key={c} ref={c === 0 ? setRef : null} className="flex shrink-0" aria-hidden={c > 0}>
              {list.map((t) => (
                <div key={t.id ?? t.client_name} className="flex w-[84vw] shrink-0 px-2.5 sm:w-[368px] sm:px-3">
                  <TestimonialCard item={t} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
