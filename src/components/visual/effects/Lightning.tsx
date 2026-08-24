import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { MotionEvent } from "@/components/engine/useEchoMotion";

function LightningInstance({ pos, onComplete }: { pos: { x: number; y: number }, onComplete: () => void }) {
  const lineRef = useRef<THREE.Line>(null);
  
  const bornAt = useRef(performance.now());
  const life = 500;

  const points = useMemo(() => {
    const pts = [];
    const segments = 12;
    let currentY = -(pos.y - 0.5) * 60;
    let currentX = (pos.x - 0.5) * 80;
    
    pts.push(new THREE.Vector3(currentX, currentY, 0));
    for (let i = 0; i < segments; i++) {
      currentY += (Math.random() * 8 + 4); 
      currentX += (Math.random() - 0.5) * 12; 
      pts.push(new THREE.Vector3(currentX, currentY, (Math.random() - 0.5) * 10));
    }
    return pts;
  }, [pos]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  const lineObj = useMemo(() => {
    return new THREE.Line(geometry, material);
  }, [geometry, material]);

  useFrame(() => {
    if (!lineRef.current) return;
    const now = performance.now();
    const progress = (now - bornAt.current) / life;
    
    if (progress >= 1) {
      onComplete();
      return;
    }
    
    // Efeito de flickering
    material.opacity = Math.random() > 0.5 ? (1 - progress) : 0.1;
  });

  return (
    <primitive object={lineObj} ref={lineRef} />
  );
}

export function LightningManager({ lastEvent, effectMappings }: { lastEvent: MotionEvent | null, effectMappings: Record<string, string> }) {
  const [lightnings, setLightnings] = useState<{ id: string; pos: { x: number; y: number } }[]>([]);

  useEffect(() => {
    if (!lastEvent) return;
    
    if (effectMappings[lastEvent.type] === "LIGHTNING") {
      const id = `${lastEvent.timestamp}-${Math.random()}`;
      setLightnings(prev => [...prev, { id, pos: lastEvent.position }]);
    }
  }, [lastEvent, effectMappings]);

  return (
    <group>
      {lightnings.map(l => (
        <LightningInstance
          key={l.id}
          pos={l.pos}
          onComplete={() => setLightnings(prev => prev.filter(x => x.id !== l.id))}
        />
      ))}
    </group>
  );
}
