import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { HandState, MotionEvent } from "@/components/engine/useEchoMotion";

// ── Partícula de fogo ─────────────────────────────────────────────────────────
interface FireParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

function createParticle(origin: THREE.Vector3, fromTip: boolean): FireParticle {
  const spread = fromTip ? 0.6 : 2.0;
  const speed = fromTip ? 0.4 : 0.25;
  return {
    position: origin.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.3,
        (Math.random() - 0.5) * spread * 0.5
      )
    ),
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.15,
      speed + Math.random() * 0.3,
      (Math.random() - 0.5) * 0.1
    ),
    life: 0,
    maxLife: 0.8 + Math.random() * 0.6,
    size: fromTip ? 1.2 + Math.random() * 1.5 : 2.0 + Math.random() * 2.5,
  };
}

const COUNT = 300;

export function FireManager({
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
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<FireParticle[]>([]);
  const timeRef = useRef(0);

  const isFireMapped = Object.entries(effectMappings).some(
    ([k, v]) => v === "FIRE"
  );

  // Geometria e atributos
  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const sz = new Float32Array(COUNT);
    return [pos, col, sz];
  }, []);

  const vertexShader = `
    attribute float aSize;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying float vLife;
    attribute float aLife;
    void main() {
      vColor = aColor;
      vLife = aLife;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vLife;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, d) * (1.0 - vLife);
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  const lifes = useMemo(() => new Float32Array(COUNT), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aLife", new THREE.BufferAttribute(lifes, 1));
    return geo;
  }, [positions, colors, sizes, lifes]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: false,
      }),
    []
  );

  useFrame((_, delta) => {
    if (!pointsRef.current || clearTrigger > 0) {
      particlesRef.current = [];
      return;
    }
    timeRef.current += delta;

    const hasFireGesture =
      isFireMapped &&
      activeHands.length > 0 &&
      lastEvent &&
      effectMappings[lastEvent.type] === "FIRE";

    // Emite novas partículas se o gesto estiver ativo
    if (hasFireGesture && activeHands.length > 0) {
      const EMIT_PER_FRAME = 8;
      for (const hand of activeHands) {
        const palmOrigin = new THREE.Vector3(
          (hand.x - 0.5) * 80,
          -(hand.y - 0.5) * 60,
          2
        );

        // Da palma — se mão aberta
        if (hand.open) {
          for (let e = 0; e < EMIT_PER_FRAME; e++) {
            particlesRef.current.push(createParticle(palmOrigin, false));
          }
        }

        // Das pontas dos dedos — quando dedo apontado (index estendido)
        if (hand.fingers[1] && hand.landmarks) {
          const tips = [4, 8, 12, 16, 20];
          const extendedTips = tips.filter((_, fi) => hand.fingers[fi]);
          for (const tipIdx of extendedTips) {
            const lm = hand.landmarks[tipIdx];
            if (!lm) continue;
            const tipOrigin = new THREE.Vector3(
              (lm.x - 0.5) * 80,
              -(lm.y - 0.5) * 60,
              2
            );
            for (let e = 0; e < 3; e++) {
              particlesRef.current.push(createParticle(tipOrigin, true));
            }
          }
        }
      }
    }

    // Atualiza e limita partículas ao buffer
    particlesRef.current = particlesRef.current.slice(-COUNT);

    // Atualiza física
    for (let i = 0; i < COUNT; i++) {
      const p = particlesRef.current[i];
      if (!p) {
        positions[i * 3] = 10000;
        continue;
      }

      p.life += delta / p.maxLife;
      if (p.life > 1) {
        positions[i * 3] = 10000;
        continue;
      }

      // Turbulência
      const turb = Math.sin(timeRef.current * 3 + i * 0.7) * 0.08;
      p.velocity.x += turb * delta;
      p.velocity.y -= 0.05 * delta; // sobe com leve desaceleração
      p.position.add(p.velocity.clone().multiplyScalar(delta * 30));

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      // Cor: brasa vermelha → laranja → amarelo → branco
      const t = 1 - p.life;
      colors[i * 3] = Math.min(1, t * 2.0);
      colors[i * 3 + 1] = Math.max(0, t * 1.2 - 0.1);
      colors[i * 3 + 2] = Math.max(0, t * 0.4 - 0.2);

      sizes[i] = p.size * (1 - p.life * 0.5);
      lifes[i] = p.life;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aLife.needsUpdate = true;
  });

  if (!isFireMapped) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
