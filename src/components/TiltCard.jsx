import { useRef } from 'react';

/* Card com efeito tilt 3D que acompanha o mouse */
export default function TiltCard({ children, className = '', maxTilt = 8 }) {
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * maxTilt * 2}deg) rotateX(${-py * maxTilt * 2}deg) scale(1.02)`;
    el.style.setProperty('--glow-x', `${(px + 0.5) * 100}%`);
    el.style.setProperty('--glow-y', `${(py + 0.5) * 100}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}
