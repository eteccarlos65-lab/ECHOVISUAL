import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { MotionEvent } from "@/components/engine/useEchoMotion";

// Mapeamento temporário (Etapa 6) - Será substituído pela IA na Etapa 8
const effectMap: Record<string, string> = {
  "HAND_OPEN": "PARTICLE_BURST",
};

function BurstInstance({ pos, onComplete }: { pos: { x: number; y: number }, onComplete: () => void }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  
  const count = 150;
  const bornAt = useRef(performance.now());
  const life = 1100;

  const [positions, velocities] = useMemo(() => {
    const p = new Float32Array(count * 3);
    const v = [];
    // Convert normalized (0-1) coordinates to Orthographic-like world coordinates
    // Assuming camera Z is 100, fov 50, screen space approx
    // We will just map x: 0..1 to -50..50, y: 0..1 to 35..-35 approx
    // For a real match, we need to unproject, but let's use a rough mapping for MVP
    const sceneX = (pos.x - 0.5) * 80;
    const sceneY = -(pos.y - 0.5) * 60;

    for (let i = 0; i < count; i++) {
      p[i * 3] = sceneX;
      p[i * 3 + 1] = sceneY;
      p[i * 3 + 2] = 0;
      const a = Math.random() * Math.PI * 2;
      const s = 0.5 + Math.random() * 1.5;
      v.push(new THREE.Vector3(Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.5) * s));
    }
    return [p, v];
  }, [pos]);

  useFrame(() => {
    if (!pointsRef.current || !matRef.current) return;
    const now = performance.now();
    const progress = (now - bornAt.current) / life;
    
    if (progress >= 1) {
      onComplete();
      return;
    }

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      velocities[i].x *= 0.96;
      velocities[i].z *= 0.96;
      velocities[i].y = velocities[i].y * 0.97 + 0.04; // gravity/buoyancy
      
      posArray[i * 3] += velocities[i].x;
      posArray[i * 3 + 1] += velocities[i].y;
      posArray[i * 3 + 2] += velocities[i].z;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    matRef.current.opacity = 1 - Math.pow(progress, 2);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={1.5}
        color="#22d3ee"
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function ParticleBurstManager({ lastEvent, effectMappings, clearTrigger }: { lastEvent: MotionEvent | null, effectMappings: Record<string, string>, clearTrigger: number }) {
  const [bursts, setBursts] = useState<{ id: string; pos: { x: number; y: number } }[]>([]);

  useEffect(() => {
    if (clearTrigger > 0) setBursts([]);
  }, [clearTrigger]);

  useEffect(() => {
    if (!lastEvent) return;
    
    if (effectMappings[lastEvent.type] === "PARTICLE_BURST") {
      const id = `${lastEvent.timestamp}-${Math.random()}`;
      setBursts(prev => [...prev, { id, pos: lastEvent.position }]);
    }
  }, [lastEvent, effectMappings]);

  return (
    <group>
      {bursts.map(b => (
        <BurstInstance
          key={b.id}
          pos={b.pos}
          onComplete={() => setBursts(prev => prev.filter(x => x.id !== b.id))}
        />
      ))}
    </group>
  );
}
