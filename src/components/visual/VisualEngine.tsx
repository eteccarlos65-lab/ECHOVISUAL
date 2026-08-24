"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { VideoBackground } from "./VideoBackground";
import { MotionEvent, HandState } from "@/components/engine/useEchoMotion";
import { ParticleBurstManager } from "./effects/ParticleBurst";
import { EnergyAura } from "./effects/EnergyAura";
import { PortalManager } from "./effects/Portal";
import { FireManager } from "./effects/Fire";
import { LightningManager } from "./effects/Lightning";
import { InvisibilityEffect } from "./effects/InvisibilityEffect";
import * as THREE from "three";

interface VisualEngineProps {
  videoElement: HTMLVideoElement | null;
  lastEvent: MotionEvent | null;
  activeHands: HandState[];
  effectMappings: Record<string, string>;
  clearTrigger: number;
  backgroundTexture: THREE.Texture | null;
}

export function VisualEngine({
  videoElement,
  lastEvent,
  activeHands,
  effectMappings,
  clearTrigger,
  backgroundTexture,
}: VisualEngineProps) {
  if (!videoElement) return null;

  const isInvisibilityActive =
    !!lastEvent && effectMappings[lastEvent.type] === "INVISIBILITY_CLOAK";

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 100], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Fundo de vídeo — desabilita quando invisibilidade está ativa (o shader cuida disso) */}
        {!isInvisibilityActive && <VideoBackground videoElement={videoElement} />}

        <ambientLight intensity={0.6} />
        <pointLight position={[0, 30, 30]} intensity={2} color="#4488ff" />
        <pointLight position={[0, -30, 30]} intensity={1} color="#ff4400" />

        {/* Efeito de Invisibilidade: shader de tela cheia */}
        <InvisibilityEffect
          videoElement={videoElement}
          backgroundTexture={backgroundTexture}
          activeHands={activeHands}
          isActive={isInvisibilityActive}
          clearTrigger={clearTrigger}
        />

        <ParticleBurstManager
          lastEvent={lastEvent}
          effectMappings={effectMappings}
          clearTrigger={clearTrigger}
        />
        <EnergyAura
          activeHands={activeHands}
          effectMappings={effectMappings}
          clearTrigger={clearTrigger}
        />
        <PortalManager
          lastEvent={lastEvent}
          effectMappings={effectMappings}
          clearTrigger={clearTrigger}
        />
        <FireManager
          lastEvent={lastEvent}
          effectMappings={effectMappings}
          activeHands={activeHands}
          clearTrigger={clearTrigger}
        />
        <LightningManager
          lastEvent={lastEvent}
          effectMappings={effectMappings}
          activeHands={activeHands}
          clearTrigger={clearTrigger}
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.6} mipmapBlur intensity={2.0} levels={6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
