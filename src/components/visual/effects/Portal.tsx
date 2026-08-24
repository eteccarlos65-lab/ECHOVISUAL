import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { MotionEvent, HandState } from "@/components/engine/useEchoMotion";

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
    float angle = atan(pos.y, pos.x);
    float swirl = sin(angle * 6.0 + uTime * -4.0 + dist * 14.0);
    float ring = smoothstep(0.48, 0.42, dist) - smoothstep(0.42, 0.18, dist);
    vec3 colorA = vec3(0.1, 0.5, 1.0);
    vec3 colorB = vec3(0.6, 0.1, 1.0);
    vec3 color = mix(colorA, colorB, swirl * 0.5 + 0.5) * ring;
    float alpha = smoothstep(0.5, 0.25, dist) * uOpacity;
    gl_FragColor = vec4(color * 2.5, alpha);
  }
`;

// Anel de torus girando em 3D
function TorusRing({
  radius,
  tube,
  color,
  rotAxis,
  rotSpeed,
  position,
}: {
  radius: number;
  tube: number;
  color: string;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotateOnAxis(rotAxis, rotSpeed * delta);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[radius, tube, 16, 60]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        wireframe={false}
      />
    </mesh>
  );
}

function PortalInstance({
  pos,
  onComplete,
}: {
  pos: { x: number; y: number };
  onComplete: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const bornAt = useRef(performance.now());
  const life = 4000;

  useFrame(({ clock }) => {
    if (!groupRef.current || !matRef.current) return;
    const progress = (performance.now() - bornAt.current) / life;
    if (progress >= 1) { onComplete(); return; }

    const scale = Math.sin(progress * Math.PI) * 1.3 + 0.1;
    groupRef.current.scale.setScalar(scale);
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    matRef.current.uniforms.uOpacity.value = Math.sin(progress * Math.PI);
  });

  const sceneX = (pos.x - 0.5) * 80;
  const sceneY = -(pos.y - 0.5) * 60;

  return (
    <group ref={groupRef} position={[sceneX, sceneY, 0]}>
      {/* Plano central com shader */}
      <mesh>
        <planeGeometry args={[22, 22]} />
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

      {/* 3 anéis de torus girando em eixos diferentes */}
      <TorusRing
        radius={9}
        tube={0.4}
        color="#3399ff"
        rotAxis={new THREE.Vector3(0, 0, 1)}
        rotSpeed={2.0}
        position={[0, 0, 0]}
      />
      <TorusRing
        radius={7}
        tube={0.3}
        color="#aa44ff"
        rotAxis={new THREE.Vector3(1, 0, 0)}
        rotSpeed={-3.0}
        position={[0, 0, 0]}
      />
      <TorusRing
        radius={11}
        tube={0.2}
        color="#00ccff"
        rotAxis={new THREE.Vector3(0.5, 1, 0).normalize()}
        rotSpeed={1.5}
        position={[0, 0, 0]}
      />
    </group>
  );
}

export function PortalManager({
  lastEvent,
  effectMappings,
  clearTrigger,
}: {
  lastEvent: MotionEvent | null;
  effectMappings: Record<string, string>;
  clearTrigger: number;
}) {
  const [portals, setPortals] = useState<{ id: string; pos: { x: number; y: number } }[]>([]);

  useEffect(() => {
    if (clearTrigger > 0) setPortals([]);
  }, [clearTrigger]);

  useEffect(() => {
    if (!lastEvent) return;
    if (effectMappings[lastEvent.type] !== "PORTAL") return;
    const id = `${lastEvent.timestamp}-${Math.random()}`;
    setPortals((prev) => [...prev, { id, pos: lastEvent.position }]);
  }, [lastEvent, effectMappings]);

  return (
    <group>
      {portals.map((p) => (
        <PortalInstance
          key={p.id}
          pos={p.pos}
          onComplete={() => setPortals((prev) => prev.filter((x) => x.id !== p.id))}
        />
      ))}
    </group>
  );
}
