import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { MotionEvent } from "@/components/engine/useEchoMotion";

export function InvisibilityCloakManager({ lastEvent, effectMappings }: { lastEvent: MotionEvent | null, effectMappings: Record<string, string> }) {
  const [active, setActive] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (!lastEvent) return;
    if (effectMappings[lastEvent.type] === "INVISIBILITY_CLOAK") {
      setActive(true);
      const t = setTimeout(() => setActive(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastEvent, effectMappings]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
  });

  if (!active) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 5]}>
      <icosahedronGeometry args={[25, 4]} />
      <MeshTransmissionMaterial
        backside
        samples={4}
        thickness={10}
        chromaticAberration={0.5}
        anisotropy={0.3}
        distortion={0.5}
        distortionScale={0.5}
        temporalDistortion={0.1}
        ior={1.2}
        color="#ffffff"
      />
    </mesh>
  );
}
