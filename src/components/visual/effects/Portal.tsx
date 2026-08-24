import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MotionEvent } from "@/components/engine/useEchoMotion";

const portalVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const portalFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 center = vec2(0.5);
    vec2 pos = vUv - center;
    float dist = length(pos);
    
    // Rotating swirl
    float angle = atan(pos.y, pos.x);
    float swirl = sin(angle * 5.0 + uTime * -3.0 + dist * 10.0);
    
    // Ring shape
    float ring = smoothstep(0.4, 0.35, dist) - smoothstep(0.35, 0.2, dist);
    
    vec3 color = vec3(0.1, 0.6, 1.0) * ring * (swirl * 0.5 + 0.5);
    
    float alpha = smoothstep(0.5, 0.3, dist) * uOpacity;
    
    gl_FragColor = vec4(color * 2.0, alpha);
  }
`;

function PortalInstance({ pos, onComplete }: { pos: { x: number; y: number }, onComplete: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  
  const bornAt = useRef(performance.now());
  const life = 3000;

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    const now = performance.now();
    const progress = (now - bornAt.current) / life;
    
    if (progress >= 1) {
      onComplete();
      return;
    }
    
    const time = clock.getElapsedTime();
    matRef.current.uniforms.uTime.value = time;
    
    // Scale animation: grow then shrink
    const scale = Math.sin(progress * Math.PI) * 1.5;
    meshRef.current.scale.set(scale, scale, scale);
    
    // Fade out
    matRef.current.uniforms.uOpacity.value = Math.sin(progress * Math.PI);
  });

  const sceneX = (pos.x - 0.5) * 80;
  const sceneY = -(pos.y - 0.5) * 60;

  return (
    <mesh ref={meshRef} position={[sceneX, sceneY, 0]}>
      <planeGeometry args={[25, 25]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={portalVertexShader}
        fragmentShader={portalFragmentShader}
        uniforms={{ uTime: { value: 0 }, uOpacity: { value: 1 } }}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function PortalManager({ lastEvent, effectMappings }: { lastEvent: MotionEvent | null, effectMappings: Record<string, string> }) {
  const [portals, setPortals] = useState<{ id: string; pos: { x: number; y: number } }[]>([]);

  useEffect(() => {
    if (!lastEvent) return;
    
    if (effectMappings[lastEvent.type] === "PORTAL") {
      const id = `${lastEvent.timestamp}-${Math.random()}`;
      setPortals(prev => [...prev, { id, pos: lastEvent.position }]);
    }
  }, [lastEvent, effectMappings]);

  return (
    <group>
      {portals.map(p => (
        <PortalInstance
          key={p.id}
          pos={p.pos}
          onComplete={() => setPortals(prev => prev.filter(x => x.id !== p.id))}
        />
      ))}
    </group>
  );
}
