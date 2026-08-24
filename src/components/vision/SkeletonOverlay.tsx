"use client";

import { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { useEffect, useRef } from "react";

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

export function SkeletonOverlay({ results, width = 640, height = 480 }: { results: HandLandmarkerResult | null, width?: number, height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!results || !results.landmarks || results.landmarks.length === 0) return;

    ctx.save();
    // Inverte no eixo X para acompanhar o modo "espelho" do vídeo
    ctx.scale(-1, 1);
    ctx.translate(-width, 0);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(52,211,153,0.9)"; // emerald-400
    ctx.fillStyle = "rgba(251,113,133,0.95)"; // rose-400

    for (const landmarks of results.landmarks) {
      // Linhas (conexões)
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
        ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
        ctx.stroke();
      }
      // Pontos (joints)
      for (const p of landmarks) {
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }, [results, width, height]);

  return (
    <canvas 
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
    />
  );
}
