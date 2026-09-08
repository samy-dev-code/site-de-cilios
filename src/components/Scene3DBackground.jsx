import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* Partículas de brilho que seguem suavemente o mouse */
function Sparkles({ count = 350 }) {
  const points = useRef();
  const target = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  useFrame((state) => {
    const mx = (state.pointer.x / 2) * viewport.width;
    const my = (state.pointer.y / 2) * viewport.height;
    target.current.x += (mx - target.current.x) * 0.03;
    target.current.y += (my - target.current.y) * 0.03;
    if (points.current) {
      points.current.rotation.y = target.current.x * 0.12;
      points.current.rotation.x = -target.current.y * 0.08;
    }
  });

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 26;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, [count]);

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        sizeAttenuation
        color="#c4a5e8"
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* Formas orgânicas em rotação suave, deslocadas pelo movimento do mouse */
function Orb({ position, radius, color, speed, sway }) {
  const mesh = useRef();
  const mat = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mesh.current.position.x = position[0] + Math.sin(t * speed) * sway + state.pointer.x * sway * 0.4;
    mesh.current.position.y = position[1] + Math.cos(t * speed * 0.8) * sway + state.pointer.y * sway * 0.4;
    mesh.current.rotation.x = t * speed * 0.3;
    mesh.current.rotation.y = t * speed * 0.2;
    if (mat.current) mat.current.opacity = 0.28 + Math.sin(t * speed) * 0.08;
  });

  return (
    <mesh ref={mesh} position={position}>
      <icosahedronGeometry args={[radius, 12]} />
      <meshPhysicalMaterial
        ref={mat}
        color={color}
        transparent
        opacity={0.28}
        roughness={0.15}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
}

export default function Scene3DBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(60,20,80,0.35) 0%, rgba(10,3,8,0) 60%)' }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[6, 6, 8]} intensity={40} color="#a855f7" />
        <pointLight position={[-8, -4, 6]} intensity={25} color="#7c3aed" />
        <Sparkles />
        <Orb position={[-5.5, 1.5, -3]} radius={2.2} color="#6d28d9" speed={0.5} sway={0.5} />
        <Orb position={[5.5, -1.5, -4]} radius={2.8} color="#4c1d95" speed={0.35} sway={0.7} />
        <Orb position={[2.5, 3, -6]} radius={1.4} color="#a855f7" speed={0.6} sway={0.35} />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0308]" />
    </div>
  );
}
