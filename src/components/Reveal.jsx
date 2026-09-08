import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/* Revela o conteúdo com fade + slide suave quando entra na viewport */
export function Reveal({ children, delay = 0, y = 36, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* Parallax suave no scroll: o conteúdo sobe mais devagar que a página */
export function Parallax({ children, strength = 40, className = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
