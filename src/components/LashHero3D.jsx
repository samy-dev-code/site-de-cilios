import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Modelo procedural de cílios volumosos — "Lash Fan".
 * Cada fio é uma curva catenária (arco natural do cílio) transformada em
 * TubeGeometry; o leque inteiro segue suavemente o mouse e respira com o tempo.
 */

// Curva de um fio de cílio: nasce na pálpebra, dobra e afina para cima
function lashCurve(origin, dir, length, curvature) {
  const tip = origin
    .clone()
    .addScaledVector(dir, length)
    .add(new THREE.Vector3(0, -curvature, 0));
  const mid = origin
    .clone()
    .lerp(tip, 0.5)
    .add(new THREE.Vector3(0, -curvature * 0.35, 0));
  return new THREE.CatmullRomCurve3([origin, mid, tip]);
}

function LashFan() {
  const group = useRef();

  // Espessura que afina em direção à ponta do fio
  const radiusFn = (u) => 0.028 * (1 - u) + 0.004;

  const strands = useMemo(() => {
    const COUNT = 64;
    const arr = [];
    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1); // 0..1 ao longo da pálpebra
      const angle = (t - 0.5) * Math.PI * 0.85; // arco de ~150°
      // Posição na "pálpebra" (arco elíptico)
      const origin = new THREE.Vector3(
        Math.sin(angle) * 1.6,
        Math.cos(angle) * 0.45 - 0.2,
        Math.sin(angle * 1.4) * 0.25,
      );
      // Direção do fio: para cima e abrindo para fora, com variação orgânica
      const dir = new THREE.Vector3(
        Math.sin(angle) * 0.55 + (Math.random() - 0.5) * 0.12,
        1,
        (Math.random() - 0.5) * 0.35,
      ).normalize();
      // Fios centrais mais longos (estilo "olho de gato" invertido)
      const length = 1.15 + Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 0.22;
      const curvature = 0.55 + Math.random() * 0.35;
      const curve = lashCurve(origin, dir, length, curvature);
      const geometry = new THREE.TubeGeometry(curve, 24, 1, 6, false);
      geometry.scale(radiusFn(0), radiusFn(0), radiusFn(0)); // base
      // Afinar a ponta: usar tubo com raio variável via substituição simples
      arr.push({ geometry, key: i, shade: 0.85 + Math.random() * 0.3 });
    }
    return arr;
  }, []);

  // Segunda camada de fios mais curtos (volume)
  const underLayer = useMemo(() => {
    const COUNT = 40;
    const arr = [];
    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1);
      const angle = (t - 0.5) * Math.PI * 0.75;
      const origin = new THREE.Vector3(
        Math.sin(angle) * 1.45,
        Math.cos(angle) * 0.4 - 0.3,
        Math.sin(angle * 1.3) * 0.2 + 0.15,
      );
      const dir = new THREE.Vector3(
        Math.sin(angle) * 0.7 + (Math.random() - 0.5) * 0.15,
        1,
        (Math.random() - 0.5) * 0.4,
      ).normalize();
      const length = 0.6 + Math.cos(angle) * 0.25 + (Math.random() - 0.5) * 0.15;
      const curve = lashCurve(origin, dir, length, 0.35 + Math.random() * 0.2);
      arr.push({
        geometry: new THREE.TubeGeometry(curve, 16, 1, 6, false),
        key: `u${i}`,
        shade: 0.7 + Math.random() * 0.25,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!group.current) return;
    // Segue o mouse com atraso suave + respiração
    const targetY = state.pointer.x * 0.5;
    const targetX = -state.pointer.y * 0.25 + Math.sin(t * 0.6) * 0.05;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
    group.current.position.y = Math.sin(t * 0.8) * 0.06;
  });

  const matProps = {
    roughness: 0.28,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.25,
    sheen: 1,
    sheenColor: '#d8b4fe',
    sheenRoughness: 0.4,
  };

  return (
    <group ref={group}>
      {strands.map(({ geometry, key, shade }) => (
        <mesh key={key} geometry={geometry}>
          <meshPhysicalMaterial
            color={new THREE.Color('#7c3aed').multiplyScalar(shade)}
            {...matProps}
          />
        </mesh>
      ))}
      {underLayer.map(({ geometry, key, shade }) => (
        <mesh key={key} geometry={geometry}>
          <meshPhysicalMaterial
            color={new THREE.Color('#4c1d95').multiplyScalar(shade)}
            {...matProps}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function LashHero3D() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0.4, 4.4], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        {/* Key light roxa */}
        <directionalLight position={[4, 5, 5]} intensity={2.4} color="#a855f7" />
        {/* Rim light lavanda atrás */}
        <directionalLight position={[-5, 2, -4]} intensity={3} color="#c4b5fd" />
        <pointLight position={[0, -3, 2]} intensity={6} color="#6d28d9" />
        <LashFan />
      </Canvas>
    </div>
  );
}
