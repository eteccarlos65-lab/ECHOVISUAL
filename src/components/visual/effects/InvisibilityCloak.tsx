import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { MotionEvent, HandState } from "@/components/engine/useEchoMotion";

export function InvisibilityCloakManager({
  lastEvent,
  effectMappings,
  activeHands,
  clearTrigger,
}: {
  lastEvent: MotionEvent | null;
  effectMappings: Record<string, string>;
  activeHands: HandState[];
  clearTrigger: number;
}) {
  const [active, setActive] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clearTrigger > 0) {
      setActive(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [clearTrigger]);

  useEffect(() => {
    if (!lastEvent) return;
    if (effectMappings[lastEvent.type] === "INVISIBILITY_CLOAK") {
      setActive(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setActive(false), 4000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lastEvent, effectMappings]);

  useFrame((state) => {
    if (!meshRef.current || !active) return;

    // Segue a posição da mão principal
    if (activeHands.length > 0) {
      const hand = activeHands[0];
      const targetX = (hand.x - 0.5) * 80;
      const targetY = -(hand.y - 0.5) * 60;
      meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.1;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
    }

    meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    meshRef.current.scale.setScalar(
      1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
    );
  });

  if (!active) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 5]}>
      <icosahedronGeometry args={[14, 3]} />
      <MeshTransmissionMaterial
        backside
        samples={4}
        thickness={8}
        chromaticAberration={0.4}
        anisotropy={0.3}
        distortion={0.4}
        distortionScale={0.4}
        temporalDistortion={0.1}
        ior={1.2}
        color="#ffffff"
      />
    </mesh>
  );
}
