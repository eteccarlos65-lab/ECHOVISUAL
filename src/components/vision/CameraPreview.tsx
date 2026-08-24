"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera as CameraIcon, CameraOff, AlertCircle, Loader2 } from "lucide-react";

export type CameraState = "idle" | "requesting" | "active" | "error";
export type CameraErrorType = "NotAllowedError" | "NotFoundError" | "NotReadableError" | "UnknownError" | null;

interface CameraProps {
  onStreamReady?: (videoElement: HTMLVideoElement) => void;
  onStreamStop?: () => void;
}

export function CameraPreview({ onStreamReady, onStreamStop }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camState, setCamState] = useState<CameraState>("idle");
  const [errorType, setErrorType] = useState<CameraErrorType>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (camState === "active") return;
    setCamState("requesting");
    setErrorType(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamState("active");
        if (onStreamReady) onStreamReady(videoRef.current);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCamState("error");
      if (err.name === "NotAllowedError") setErrorType("NotAllowedError");
      else if (err.name === "NotFoundError") setErrorType("NotFoundError");
      else if (err.name === "NotReadableError") setErrorType("NotReadableError");
      else setErrorType("UnknownError");
    }
  }, [camState, onStreamReady]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamState("idle");
    if (onStreamStop) onStreamStop();
  }, [onStreamStop]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="relative w-full aspect-video bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 shadow-lg flex flex-col items-center justify-center">
      {/* Video Element (Hidden if not active, but always in DOM to attach stream) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${camState === "active" ? "opacity-100" : "opacity-0"}`}
      />

      {/* Overlay states */}
      {camState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 z-10 bg-neutral-900/50 backdrop-blur-sm">
          <CameraOff className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm max-w-xs text-center">
            A câmera está desligada. Ative para iniciar a captura de movimentos.
          </p>
          <button 
            onClick={startCamera}
            className="mt-6 px-6 py-2.5 bg-neutral-100 text-neutral-900 rounded-lg font-medium hover:bg-white transition-colors flex items-center gap-2"
          >
            <CameraIcon className="w-4 h-4" />
            Ativar Câmera
          </button>
        </div>
      )}

      {camState === "requesting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 z-10 bg-neutral-900/80 backdrop-blur-md">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-cyan-400" />
          <p className="text-sm font-medium">Solicitando permissão...</p>
        </div>
      )}

      {camState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 z-10 bg-neutral-900/90 backdrop-blur-md">
          <AlertCircle className="w-12 h-12 mb-4 text-rose-500" />
          <p className="text-sm font-semibold text-rose-400 mb-1">
            {errorType === "NotAllowedError" && "Acesso à câmera negado"}
            {errorType === "NotFoundError" && "Nenhuma câmera encontrada"}
            {errorType === "NotReadableError" && "Câmera em uso por outro app"}
            {errorType === "UnknownError" && "Erro desconhecido ao acessar câmera"}
          </p>
          <p className="text-xs max-w-[260px] text-center text-neutral-500">
            {errorType === "NotAllowedError" ? "Por favor, libere o acesso nas permissões do seu navegador e tente novamente." : "Verifique seu dispositivo de vídeo."}
          </p>
          <button 
            onClick={startCamera}
            className="mt-6 px-4 py-2 border border-neutral-700 hover:border-neutral-600 rounded-lg text-sm font-medium transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Status indicator when active */}
      {camState === "active" && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-neutral-950/60 backdrop-blur border border-neutral-800 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          <span className="text-xs font-medium text-emerald-100 tracking-wide uppercase">Câmera Ativa</span>
        </div>
      )}

      {/* Stop button when active */}
      {camState === "active" && (
        <button 
          onClick={stopCamera}
          className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-neutral-950/60 hover:bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 text-neutral-300 hover:text-white"
        >
          <CameraOff className="w-3.5 h-3.5" />
          Pausar
        </button>
      )}
    </div>
  );
}
