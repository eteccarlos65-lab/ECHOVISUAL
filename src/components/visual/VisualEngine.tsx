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
import { InvisibilityCloakManager } from "./effects/InvisibilityCloak";

interface VisualEngineProps {
  videoElement: HTMLVideoElement | null;
  lastEvent: MotionEvent | null;
  activeHands: HandState[];
  effectMappings: Record<string, string>;
  clearTrigger: number;
}

export function VisualEngine({
  videoElement,
  lastEvent,
  activeHands,
  effectMappings,
  clearTrigger,
}: VisualEngineProps) {
  if (!videoElement) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 100], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <VideoBackground videoElement={videoElement} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />

        <ParticleBurstManager lastEvent={lastEvent} effectMappings={effectMappings} clearTrigger={clearTrigger} />
        <EnergyAura activeHands={activeHands} effectMappings={effectMappings} clearTrigger={clearTrigger} />
        <PortalManager lastEvent={lastEvent} effectMappings={effectMappings} clearTrigger={clearTrigger} />
        <FireManager lastEvent={lastEvent} effectMappings={effectMappings} clearTrigger={clearTrigger} />
        <LightningManager lastEvent={lastEvent} effectMappings={effectMappings} clearTrigger={clearTrigger} />
        <InvisibilityCloakManager
          lastEvent={lastEvent}
          effectMappings={effectMappings}
          activeHands={activeHands}
          clearTrigger={clearTrigger}
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
