import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { MotionEvent, HandState } from "@/components/engine/useEchoMotion";

// Gera um bolt de relâmpago com galhos
function buildLightningGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number,
  spread: number,
  depth: number
): THREE.Vector3[] {
  if (depth === 0 || segments < 2) return [start, end];

  const mid = start.clone().lerp(end, 0.5);
  mid.x += (Math.random() - 0.5) * spread;
  mid.y += (Math.random() - 0.5) * spread * 0.5;
  mid.z += (Math.random() - 0.5) * spread * 0.3;

  const left = buildLightningGeometry(start, mid, Math.ceil(segments / 2), spread * 0.6, depth - 1);
  const right = buildLightningGeometry(mid, end, Math.floor(segments / 2), spread * 0.6, depth - 1);
  return [...left, ...right];
}

function LightningBolt({
  origin,
  onComplete,
}: {
  origin: THREE.Vector3;
  onComplete: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bornAt = useRef(performance.now());
  const life = 600;

  const { mainPoints, branches } = useMemo(() => {
    const endPt = origin.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      30 + Math.random() * 20,
      0
    ));

    const mainPts = buildLightningGeometry(origin, endPt, 16, 8, 4);

    // 3 galhos secundários em pontos aleatórios do bolt
    const branchList: THREE.Vector3[][] = [];
    for (let b = 0; b < 3; b++) {
      const attachIdx = Math.floor(mainPts.length * 0.2 + Math.random() * mainPts.length * 0.6);
      const attachPt = mainPts[attachIdx];
      if (!attachPt) continue;
      const branchEnd = attachPt.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        10 + Math.random() * 15,
        0
      ));
      branchList.push(buildLightningGeometry(attachPt, branchEnd, 8, 4, 2));
    }
    return { mainPoints: mainPts, branches: branchList };
  }, [origin]);

  useFrame(() => {
    if (!groupRef.current) return;
    const progress = (performance.now() - bornAt.current) / life;
    if (progress >= 1) { onComplete(); return; }

    // Flickering
    const opacity = Math.random() > 0.3 ? (1 - progress) : 0.05;
    groupRef.current.children.forEach((child) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      if (mat) mat.opacity = opacity;
    });
  });

  const makeLineGeo = (pts: THREE.Vector3[]) =>
    new THREE.BufferGeometry().setFromPoints(pts);

  const mainMat = new THREE.LineBasicMaterial({
    color: 0xaaddff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    linewidth: 2,
  });

  const branchMat = new THREE.LineBasicMaterial({
    color: 0x88bbff,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });

  return (
    <group ref={groupRef}>
      <primitive object={new THREE.Line(makeLineGeo(mainPoints), mainMat)} />
      {branches.map((pts, i) => (
        <primitive key={i} object={new THREE.Line(makeLineGeo(pts), branchMat.clone())} />
      ))}
    </group>
  );
}

export function LightningManager({
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
  const [bolts, setBolts] = useState<{ id: string; origin: THREE.Vector3 }[]>([]);

  useEffect(() => {
    if (clearTrigger > 0) setBolts([]);
  }, [clearTrigger]);

  useEffect(() => {
    if (!lastEvent) return;
    if (effectMappings[lastEvent.type] !== "LIGHTNING") return;

    // Dispara da ponta do dedo indicador, ou da palma
    let originPos = lastEvent.position;
    if (activeHands.length > 0) {
      const hand = activeHands[0];
      // Ponta do indicador (landmark 8)
      const tip = hand.landmarks?.[8];
      originPos = tip
        ? { x: tip.x, y: tip.y }
        : { x: hand.tipX, y: hand.tipY };
    }

    const sceneOrigin = new THREE.Vector3(
      (originPos.x - 0.5) * 80,
      -(originPos.y - 0.5) * 60,
      0
    );

    const id = `${lastEvent.timestamp}-${Math.random()}`;
    setBolts((prev) => [...prev, { id, origin: sceneOrigin }]);
  }, [lastEvent, effectMappings, activeHands]);

  return (
    <group>
      {bolts.map((b) => (
        <LightningBolt
          key={b.id}
          origin={b.origin}
          onComplete={() => setBolts((prev) => prev.filter((x) => x.id !== b.id))}
        />
      ))}
    </group>
  );
}
