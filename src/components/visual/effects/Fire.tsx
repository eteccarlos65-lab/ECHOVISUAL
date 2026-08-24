import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MotionEvent } from "@/components/engine/useEchoMotion";

const fireVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fireFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i=0; i<4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }
  
  void main() {
    vec2 pos = vUv * 2.0 - 1.0;
    pos.y += 0.5; 
    
    vec2 q = pos;
    q.y -= uTime * 1.5;
    
    float n = fbm(q * 3.0);
    
    float shape = 1.0 - length(pos * vec2(1.0, 0.5) - vec2(0.0, -0.2));
    shape = smoothstep(0.0, 1.0, shape);
    
    float intensity = n * shape;
    
    vec3 col = mix(vec3(1.0, 0.1, 0.0), vec3(1.0, 0.9, 0.0), intensity);
    col *= intensity * 2.0;
    
    float alpha = smoothstep(0.2, 0.8, intensity) * uOpacity;
    
    gl_FragColor = vec4(col, alpha);
  }
`;

function FireInstance({ pos, onComplete }: { pos: { x: number; y: number }, onComplete: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  
  const bornAt = useRef(performance.now());
  const life = 2000;

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    const now = performance.now();
    const progress = (now - bornAt.current) / life;
    
    if (progress >= 1) {
      onComplete();
      return;
    }
    
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    matRef.current.uniforms.uOpacity.value = Math.sin(progress * Math.PI);
  });

  const sceneX = (pos.x - 0.5) * 80;
  const sceneY = -(pos.y - 0.5) * 60;

  return (
    <mesh ref={meshRef} position={[sceneX, sceneY, 0]}>
      <planeGeometry args={[15, 20]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={fireVertexShader}
        fragmentShader={fireFragmentShader}
        uniforms={{ uTime: { value: 0 }, uOpacity: { value: 1 } }}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function FireManager({ lastEvent, effectMappings, clearTrigger }: { lastEvent: MotionEvent | null, effectMappings: Record<string, string>, clearTrigger: number }) {
  const [fires, setFires] = useState<{ id: string; pos: { x: number; y: number } }[]>([]);

  useEffect(() => {
    if (clearTrigger > 0) setFires([]);
  }, [clearTrigger]);

  useEffect(() => {
    if (!lastEvent) return;
    
    if (effectMappings[lastEvent.type] === "FIRE") {
      const id = `${lastEvent.timestamp}-${Math.random()}`;
      setFires(prev => [...prev, { id, pos: lastEvent.position }]);
    }
  }, [lastEvent, effectMappings]);

  return (
    <group>
      {fires.map(f => (
        <FireInstance
          key={f.id}
          pos={f.pos}
          onComplete={() => setFires(prev => prev.filter(x => x.id !== f.id))}
        />
      ))}
    </group>
  );
}
