"use client";

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from "@mediapipe/tasks-vision";

export function useHandTracking(videoElement: HTMLVideoElement | null) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const [results, setResults] = useState<HandLandmarkerResult | null>(null);
  const requestRef = useRef<number>(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let active = true;
    async function initModel() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });
        if (active) {
          handLandmarkerRef.current = landmarker;
          setIsModelLoaded(true);
        }
      } catch (err) {
        console.error("Error loading MediaPipe model:", err);
      }
    }
    initModel();
    return () => {
      active = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!videoElement || !isModelLoaded) return;

    const detect = () => {
      if (videoElement.readyState >= 2 && handLandmarkerRef.current) {
        const startTimeMs = performance.now();
        if (videoElement.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = videoElement.currentTime;
          const detections = handLandmarkerRef.current.detectForVideo(videoElement, startTimeMs);
          setResults(detections);
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [videoElement, isModelLoaded]);

  return { isModelLoaded, results };
}
