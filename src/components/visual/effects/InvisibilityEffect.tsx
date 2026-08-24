import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { HandState } from "@/components/engine/useEchoMotion";

// ─── Vertex Shader ────────────────────────────────────────────────────────────
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// ─── Fragment Shader ─────────────────────────────────────────────────────────
const fragmentShader = `
uniform sampler2D uVideoTex;
uniform sampler2D uBgTex;
uniform float uTime;
uniform float uActive;
uniform vec2 uHands[4]; // up to 2 hands x 2 coords
uniform int uHandCount;
uniform vec2 uResolution;

varying vec2 vUv;

// Hash function for noise
float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Smooth noise
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

// FBM - fractal noise
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.1;
    amp *= 0.48;
  }
  return v;
}

// Chromatic aberration sample
vec3 chromaSample(sampler2D tex, vec2 uv, float strength) {
  vec2 dir = (uv - 0.5) * strength;
  float r = texture2D(tex, uv + dir * vec2(1.0, 0.0)).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - dir * vec2(1.0, 0.0)).b;
  return vec3(r, g, b);
}

void main() {
  // Flip UV para coincidir com espelho do vídeo
  vec2 uv = vec2(1.0 - vUv.x, vUv.y);
  vec2 uvOrig = uv;

  vec4 videoCol = texture2D(uVideoTex, uvOrig);

  if (uActive < 0.5 || uHandCount == 0) {
    gl_FragColor = videoCol;
    return;
  }

  float aspect = uResolution.x / uResolution.y;

  // Calcula influência acumulada das mãos
  float totalInfluence = 0.0;
  vec2 totalDisp = vec2(0.0);

  for (int i = 0; i < 2; i++) {
    if (i >= uHandCount) break;
    vec2 handUV = uHands[i];

    // Corrige aspecto
    vec2 delta = uv - handUV;
    delta.x *= aspect;
    float dist = length(delta);

    float radius = 0.22;
    float falloff = smoothstep(radius, radius * 0.3, dist);

    // Distorção de fluido ao redor da mão
    float t = uTime * 0.8;
    vec2 noiseUV = uv * 4.0 + vec2(t * 0.3, t * 0.2);
    vec2 dispDir = normalize(delta + vec2(0.0001));
    float n = fbm(noiseUV + dist * 3.0);
    vec2 disp = (dispDir * (1.0 - dist / radius) + vec2(n - 0.5, n - 0.5) * 0.8) * falloff * 0.06;

    totalDisp += disp;
    totalInfluence += falloff;
  }

  totalInfluence = clamp(totalInfluence, 0.0, 1.0);

  // Amostra o fundo capturado com distorção + aberração cromática
  vec2 bgUV = uvOrig + totalDisp;
  vec3 bgSample = chromaSample(uBgTex, bgUV, totalInfluence * 0.015);

  // Brilho Fresnel nas bordas da zona de invisibilidade
  float fresnelGlow = 0.0;
  for (int i = 0; i < 2; i++) {
    if (i >= uHandCount) break;
    vec2 handUV = uHands[i];
    vec2 delta = uv - handUV;
    delta.x *= aspect;
    float dist = length(delta);
    float radius = 0.22;
    // Anel de brilho na borda
    float ring = smoothstep(radius, radius * 0.85, dist) - smoothstep(radius * 0.85, radius * 0.55, dist);
    // Pulso animado
    float pulse = 0.7 + 0.3 * sin(uTime * 4.0 + dist * 20.0);
    fresnelGlow += ring * pulse;
  }
  fresnelGlow = clamp(fresnelGlow, 0.0, 1.0);

  // Cor do brilho fresnel: ciano/teal sci-fi
  vec3 fresnelColor = vec3(0.0, 0.9, 0.85) * fresnelGlow * 2.5;

  // Mix: vídeo normal → fundo distorcido → brilho
  vec3 finalColor = mix(videoCol.rgb, bgSample, totalInfluence * 0.95);
  finalColor += fresnelColor;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface InvisibilityEffectProps {
  videoElement: HTMLVideoElement;
  backgroundTexture: THREE.Texture | null;
  activeHands: HandState[];
  isActive: boolean;
  clearTrigger: number;
}

export function InvisibilityEffect({
  videoElement,
  backgroundTexture,
  activeHands,
  isActive,
  clearTrigger,
}: InvisibilityEffectProps) {
  const { size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const videoTexture = useMemo(() => {
    const tex = new THREE.VideoTexture(videoElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [videoElement]);

  const uniforms = useMemo(
    () => ({
      uVideoTex: { value: videoTexture },
      uBgTex: { value: backgroundTexture ?? videoTexture },
      uTime: { value: 0 },
      uActive: { value: 0 },
      uHands: { value: [new THREE.Vector2(0.5, 0.5), new THREE.Vector2(0.5, 0.5)] },
      uHandCount: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videoTexture]
  );

  useEffect(() => {
    if (matRef.current && backgroundTexture) {
      matRef.current.uniforms.uBgTex.value = backgroundTexture;
    }
  }, [backgroundTexture]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uActive.value = clearTrigger > 0 ? 0 : isActive ? 1 : 0;
    }
  }, [isActive, clearTrigger]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.uniforms.uTime.value = t;
    matRef.current.uniforms.uResolution.value.set(size.width, size.height);

    // Atualiza posição das mãos (coords normalizadas 0..1)
    const hands = activeHands.slice(0, 2);
    matRef.current.uniforms.uHandCount.value = hands.length;
    hands.forEach((h, i) => {
      matRef.current!.uniforms.uHands.value[i].set(h.x, 1 - h.y);
    });
  });

  return (
    <mesh ref={meshRef}>
      {/* Quad que cobre toda a tela em NDC */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
