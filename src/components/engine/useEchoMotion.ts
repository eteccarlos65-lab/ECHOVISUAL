"use client";

import { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState, useCallback } from "react";
import { OneEuroFilter } from "@/lib/OneEuroFilter";

// ─── Tipos de Gestos ───────────────────────────────────────────────────────
export type MotionEventType =
  | "RIGHT_HAND_UP"
  | "LEFT_HAND_UP"
  | "BOTH_HANDS_UP"
  | "HAND_MOVING"
  | "PALM_OPEN"
  | "FIST_CLOSED"
  | "HANDS_SPREAD"
  | "PINCH"
  | "THUMBS_UP"
  | "VICTORY_SIGN"
  | "SWIPE_LEFT"
  | "SWIPE_RIGHT"
  | "CROSS_ARMS";

export interface MotionEvent {
  type: MotionEventType;
  confidence: number;
  timestamp: number;
  position: { x: number; y: number; z?: number };
}

export interface HandState {
  x: number;
  y: number;
  tipX: number;
  tipY: number;
  open: boolean;
  openness: number;
  pinch: boolean;
  pinchAmount: number;
  landmarks: { x: number; y: number; z: number }[];
  fingers: boolean[]; // [thumb, index, middle, ring, pinky]
}

// ─── Utilitários de Geometria ──────────────────────────────────────────────
function dist(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Retorna quais dedos estão estendidos: [polegar, indicador, médio, anelar, mínimo] */
function getExtendedFingers(
  lm: { x: number; y: number; z: number }[]
): boolean[] {
  // Pontos de referência: dedo estendido = ponta acima da articulação PIP
  const tips = [4, 8, 12, 16, 20];
  const pips = [3, 6, 10, 14, 18]; // IP para polegar, PIP para outros
  const mcps = [2, 5, 9, 13, 17];

  const extended: boolean[] = [];

  // Polegar: usa diferença horizontal (relativa ao pulso)
  const wrist = lm[0];
  const thumbMcp = lm[2];
  const thumbTip = lm[4];
  const thumbDir = thumbTip.x - thumbMcp.x;
  const handDir = wrist.x - thumbMcp.x;
  extended.push(Math.sign(thumbDir) !== Math.sign(handDir));

  // Outros 4 dedos: ponta acima da articulação PIP na vertical
  for (let i = 1; i < 5; i++) {
    extended.push(lm[tips[i]].y < lm[pips[i]].y);
  }
  return extended;
}

// ─── Hook Principal ────────────────────────────────────────────────────────
export function useEchoMotion(results: HandLandmarkerResult | null) {
  const [lastEvent, setLastEvent] = useState<MotionEvent | null>(null);
  const [activeHands, setActiveHands] = useState<HandState[]>([]);

  const filtersRef = useRef([
    {
      px: new OneEuroFilter(),
      py: new OneEuroFilter(),
      tx: new OneEuroFilter(),
      ty: new OneEuroFilter(),
    },
    {
      px: new OneEuroFilter(),
      py: new OneEuroFilter(),
      tx: new OneEuroFilter(),
      ty: new OneEuroFilter(),
    },
  ]);

  // Buffer de posições para cálculo de velocidade (swipe)
  const posHistoryRef = useRef<{ x: number; y: number; t: number }[][]>([
    [],
    [],
  ]);

  const lastEmittedRef = useRef<Record<string, number>>({});

  const emitEvent = useCallback(
    (
      type: MotionEventType,
      confidence: number,
      pos: { x: number; y: number },
      cooldown = 700
    ) => {
      const now = performance.now();
      if (
        lastEmittedRef.current[type] &&
        now - lastEmittedRef.current[type] < cooldown
      )
        return;
      lastEmittedRef.current[type] = now;
      setLastEvent({ type, confidence, timestamp: now, position: pos });
    },
    []
  );

  useEffect(() => {
    if (!results || !results.landmarks || results.landmarks.length === 0) {
      setActiveHands((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const now = performance.now();
    const hands: HandState[] = [];

    for (const lm of results.landmarks) {
      // Espelha X para sincronizar com o vídeo
      const mlm = lm.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z ?? 0 }));

      const palmX =
        (mlm[0].x + mlm[5].x + mlm[9].x + mlm[13].x + mlm[17].x) / 5;
      const palmY =
        (mlm[0].y + mlm[5].y + mlm[9].y + mlm[13].y + mlm[17].y) / 5;

      const palmSize = Math.max(0.02, dist(mlm[0], mlm[9]));
      const pinchDist = dist(mlm[4], mlm[8]);

      let tipSpreadSum = 0;
      for (const i of [4, 8, 12, 16, 20]) {
        tipSpreadSum += dist(mlm[i], { x: palmX, y: palmY });
      }
      const tipSpread = tipSpreadSum / 5 / palmSize;

      const fingers = getExtendedFingers(mlm);

      hands.push({
        x: palmX,
        y: palmY,
        tipX: mlm[8].x,
        tipY: mlm[8].y,
        open: fingers.filter(Boolean).length >= 4,
        openness: Math.max(0.5, Math.min(1.8, tipSpread)),
        pinch: pinchDist < palmSize * 0.42,
        pinchAmount: Math.max(0, Math.min(1, 1 - pinchDist / palmSize / 0.7)),
        landmarks: mlm,
        fingers,
      });
    }

    // Ordena por X (esquerda → direita)
    hands.sort((a, b) => a.x - b.x);

    // Aplica filtro de suavização e atualiza histórico de posição
    hands.forEach((h, i) => {
      const f = filtersRef.current[i] || filtersRef.current[1];
      h.x = f.px.filter(h.x, now);
      h.y = f.py.filter(h.y, now);
      h.tipX = f.tx.filter(h.tipX, now);
      h.tipY = f.ty.filter(h.tipY, now);

      const hist = posHistoryRef.current[i] || [];
      hist.push({ x: h.x, y: h.y, t: now });
      // Mantém apenas os últimos 300ms
      const cutoff = now - 300;
      posHistoryRef.current[i] = hist.filter((p) => p.t > cutoff);
    });

    setActiveHands([...hands]);

    // ── Classificação de Gestos ─────────────────────────────────────────────
    for (let i = 0; i < hands.length; i++) {
      const h = hands[i];
      const [thumb, index, middle, ring, pinky] = h.fingers;
      const pos = { x: h.x, y: h.y };

      // PALM_OPEN: 4 ou 5 dedos estendidos
      const extCount = h.fingers.filter(Boolean).length;
      if (extCount >= 4) {
        emitEvent("PALM_OPEN", 0.92, pos);
      }

      // FIST_CLOSED: todos fechados
      if (extCount === 0) {
        emitEvent("FIST_CLOSED", 0.9, pos);
      }

      // THUMBS_UP: polegar estendido, outros fechados
      if (thumb && !index && !middle && !ring && !pinky) {
        emitEvent("THUMBS_UP", 0.93, pos);
      }

      // VICTORY_SIGN (✌️): indicador + médio estendidos, resto fechado
      if (!thumb && index && middle && !ring && !pinky) {
        emitEvent("VICTORY_SIGN", 0.9, pos);
      }

      // PINCH: ponta do polegar e indicador muito próximos
      if (h.pinch) {
        emitEvent("PINCH", 0.88, pos);
      }

      // Mão levantada (palma na metade superior da tela)
      if (h.y < 0.5) {
        const gesture = h.x < 0.5 ? "RIGHT_HAND_UP" : "LEFT_HAND_UP";
        emitEvent(gesture, 0.85, pos, 500);
      } else {
        emitEvent("HAND_MOVING", 0.75, pos, 400);
      }

      // SWIPE: velocidade horizontal alta nos últimos 300ms
      const hist = posHistoryRef.current[i];
      if (hist.length >= 3) {
        const oldest = hist[0];
        const newest = hist[hist.length - 1];
        const dt = (newest.t - oldest.t) / 1000;
        if (dt > 0) {
          const vx = (newest.x - oldest.x) / dt;
          if (vx > 1.5) emitEvent("SWIPE_RIGHT", 0.88, pos, 600);
          if (vx < -1.5) emitEvent("SWIPE_LEFT", 0.88, pos, 600);
        }
      }
    }

    // ── Gestos de Duas Mãos ─────────────────────────────────────────────────
    if (hands.length === 2) {
      const [h1, h2] = hands;
      const center = { x: (h1.x + h2.x) / 2, y: (h1.y + h2.y) / 2 };

      // BOTH_HANDS_UP
      if (h1.y < 0.6 && h2.y < 0.6) {
        emitEvent("BOTH_HANDS_UP", 0.9, center, 500);
      }

      // HANDS_SPREAD
      const d = dist(h1, h2);
      if (d > 0.35) {
        emitEvent("HANDS_SPREAD", 0.9, center, 400);
      }

      // CROSS_ARMS: mão esquerda (menor X) está à direita da mão direita (maior X)
      // Ou seja, as posições X estão invertidas em relação ao esperado
      if (Math.abs(h1.x - h2.x) < 0.15 && Math.abs(h1.y - h2.y) < 0.25) {
        emitEvent("CROSS_ARMS", 0.95, center, 1500);
      }
    }
  }, [results, emitEvent]);

  return { activeHands, lastEvent };
}
