import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function VideoBackground({ videoElement }: { videoElement: HTMLVideoElement }) {
  const { scene } = useThree();
  const textureRef = useRef<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (!videoElement) return;
    const texture = new THREE.VideoTexture(videoElement);
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // Inverte a textura no eixo X para manter o efeito de espelho
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = -1;
    
    scene.background = texture;
    textureRef.current = texture;

    return () => {
      scene.background = null;
      texture.dispose();
    };
  }, [videoElement, scene]);

  return null;
}
