import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HandState } from "@/components/engine/useEchoMotion";

const auraVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auraFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center);
    float alpha = smoothstep(0.5, 0.05, dist);
    alpha *= 0.7 + 0.3 * sin(uTime * 8.0 - dist * 15.0);
    gl_FragColor = vec4(uColor, alpha * uOpacity);
  }
`;

export function EnergyAura({
  activeHands,
  effectMappings,
  clearTrigger,
}: {
  activeHands: HandState[];
  effectMappings: Record<string, string>;
  clearTrigger: number;
}) {
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    materialsRef.current.forEach((mat) => {
      if (mat) mat.uniforms.uTime.value = time;
    });
  });

  const auraColor = new THREE.Color(0xa855f7).multiplyScalar(2);
  const shouldRender =
    clearTrigger === 0 &&
    Object.values(effectMappings).includes("ENERGY_AURA") &&
    activeHands.length > 0;

  if (!shouldRender) return null;

  return (
    <group>
      {activeHands.map((hand, i) => {
        const sceneX = (hand.x - 0.5) * 80;
        const sceneY = -(hand.y - 0.5) * 60;

        return (
          <mesh key={i} position={[sceneX, sceneY, 0]}>
            <planeGeometry args={[12, 12]} />
            <shaderMaterial
              ref={(el) => {
                if (el) materialsRef.current[i] = el;
              }}
              vertexShader={auraVertexShader}
              fragmentShader={auraFragmentShader}
              uniforms={{
                uTime: { value: 0 },
                uColor: { value: auraColor },
                uOpacity: { value: 1.0 },
              }}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
