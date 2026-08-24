"use client";

import { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState, useCallback } from "react";
import { OneEuroFilter } from "@/lib/OneEuroFilter";

export type MotionEventType = 
  | "RIGHT_HAND_UP"
  | "LEFT_HAND_UP"
  | "BOTH_HANDS_UP"
  | "HAND_MOVING"
  | "HAND_OPEN"
  | "HAND_CLOSED"
  | "HANDS_SPREAD"
  | "PINCH";

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
  landmarks: any[];
}

export function useEchoMotion(results: HandLandmarkerResult | null) {
  const [lastEvent, setLastEvent] = useState<MotionEvent | null>(null);
  const [activeHands, setActiveHands] = useState<HandState[]>([]);
  
  const filtersRef = useRef([
    { px: new OneEuroFilter(), py: new OneEuroFilter(), tx: new OneEuroFilter(), ty: new OneEuroFilter() },
    { px: new OneEuroFilter(), py: new OneEuroFilter(), tx: new OneEuroFilter(), ty: new OneEuroFilter() }
  ]);
  
  const lastEmittedRef = useRef<Record<string, number>>({});
  const zoomActiveRef = useRef(false);

  const emitEvent = useCallback((type: MotionEventType, confidence: number, pos: {x: number, y: number}) => {
    const now = performance.now();
    const COOLDOWN_MS = 650;
    if (lastEmittedRef.current[type] && now - lastEmittedRef.current[type] < COOLDOWN_MS) return;
    lastEmittedRef.current[type] = now;
    
    setLastEvent({ type, confidence, timestamp: now, position: pos });
  }, []);

  useEffect(() => {
    if (!results || !results.landmarks || results.landmarks.length === 0) {
      setActiveHands(prev => prev.length === 0 ? prev : []);
      zoomActiveRef.current = false;
      return;
    }

    const now = performance.now();
    const hands: HandState[] = [];
    
    for (const lm of results.landmarks) {
      // Invert X because video is mirrored
      const mlm = lm.map(p => ({ x: 1 - p.x, y: p.y, z: p.z }));
      
      const palmX = (mlm[0].x + mlm[5].x + mlm[9].x + mlm[13].x + mlm[17].x) / 5;
      const palmY = (mlm[0].y + mlm[5].y + mlm[9].y + mlm[13].y + mlm[17].y) / 5;
      const palm = { x: palmX, y: palmY };
      
      const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
      const palmSize = Math.max(0.02, dist(mlm[0], mlm[9]));
      
      let tipSpreadSum = 0;
      for (const i of [4, 8, 12, 16, 20]) {
        tipSpreadSum += dist(mlm[i], palm);
      }
      const tipSpread = (tipSpreadSum / 5) / palmSize;
      
      const pinchDist = dist(mlm[4], mlm[8]);
      
      hands.push({
        x: palm.x,
        y: palm.y,
        tipX: mlm[8].x,
        tipY: mlm[8].y,
        open: tipSpread > 1.35,
        openness: Math.max(0.5, Math.min(1.8, tipSpread)),
        pinch: pinchDist < palmSize * 0.42,
        pinchAmount: Math.max(0, Math.min(1, 1 - (pinchDist / palmSize) / 0.7)),
        landmarks: mlm
      });
    }

    hands.sort((a, b) => a.x - b.x);

    hands.forEach((h, i) => {
      const f = filtersRef.current[i] || filtersRef.current[1];
      h.x = f.px.filter(h.x, now);
      h.y = f.py.filter(h.y, now);
      h.tipX = f.tx.filter(h.tipX, now);
      h.tipY = f.ty.filter(h.tipY, now);
    });

    setActiveHands([...hands]); // Trigger re-render with fresh values

    for (const h of hands) {
      const trig = h.x < 0.5 ? "RIGHT_HAND_UP" : "LEFT_HAND_UP";
      const conf = 0.85;
      if (h.y < 0.6) emitEvent(trig, conf, h);
      else emitEvent("HAND_MOVING", conf, h);
      
      emitEvent(h.open ? "HAND_OPEN" : "HAND_CLOSED", 0.8, h);
      if (h.pinch) emitEvent("PINCH", 0.8, h);
    }

    if (hands.length === 2) {
      const [h1, h2] = hands;
      if (h1.y < 0.6 && h2.y < 0.6) {
        emitEvent("BOTH_HANDS_UP", 0.85, { x: (h1.x + h2.x) / 2, y: (h1.y + h2.y) / 2 });
      }
      
      const d = Math.hypot(h1.x - h2.x, h1.y - h2.y);
      const OPEN_T = 0.32;
      const CLOSE_T = 0.16;
      
      if (!zoomActiveRef.current && d > OPEN_T) {
        zoomActiveRef.current = true;
      } else if (zoomActiveRef.current && d < CLOSE_T) {
        zoomActiveRef.current = false;
      }
      
      if (zoomActiveRef.current) {
        emitEvent("HANDS_SPREAD", 0.9, { x: (h1.x + h2.x) / 2, y: (h1.y + h2.y) / 2 });
      }
    } else {
      zoomActiveRef.current = false;
    }

  }, [results, emitEvent]);

  return { activeHands, lastEvent };
}
