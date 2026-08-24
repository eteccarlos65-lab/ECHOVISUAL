"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { CameraPreview } from "@/components/vision/CameraPreview";
import { useHandTracking } from "@/components/vision/useHandTracking";
import { SkeletonOverlay } from "@/components/vision/SkeletonOverlay";
import { useEchoMotion } from "@/components/engine/useEchoMotion";
import { VisualEngine } from "@/components/visual/VisualEngine";
import { EffectMappingEditor } from "@/components/editor/EffectMappingEditor";

const DEFAULT_MAPPINGS: Record<string, string> = {
  "PALM_OPEN":     "PARTICLE_BURST",
  "THUMBS_UP":     "FIRE",
  "VICTORY_SIGN":  "LIGHTNING",
  "PINCH":         "ENERGY_AURA",
  "BOTH_HANDS_UP": "PORTAL",
  "HANDS_SPREAD":  "INVISIBILITY_CLOAK",
  "SWIPE_RIGHT":   "FIRE",
  "SWIPE_LEFT":    "PARTICLE_BURST",
  "CROSS_ARMS":    "NONE",
};

const EFFECT_COLORS: Record<string, string> = {
  PARTICLE_BURST: "text-amber-400",
  ENERGY_AURA: "text-violet-400",
  PORTAL: "text-cyan-400",
  FIRE: "text-orange-400",
  LIGHTNING: "text-sky-300",
  INVISIBILITY_CLOAK: "text-slate-400",
  NONE: "text-neutral-600",
};

export default function Home() {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const { isModelLoaded, results } = useHandTracking(videoEl);
  const { activeHands, lastEvent } = useEchoMotion(results);
  const numHands = activeHands.length;

  const [effectMappings, setEffectMappings] = useState<Record<string, string>>(DEFAULT_MAPPINGS);
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "ai">("editor");
  const [mounted, setMounted] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [backgroundTexture, setBackgroundTexture] = useState<THREE.Texture | null>(null);
  const [bgCaptured, setBgCaptured] = useState(false);

  const clearEffects = () => setClearTrigger(prev => prev + 1);

  const captureBackground = useCallback(() => {
    if (!videoEl) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Espelha horizontalmente para coincidir com o vídeo
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    setBackgroundTexture(tex);
    setBgCaptured(true);
  }, [videoEl]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMappingChange = (event: string, effect: string) => {
    setEffectMappings(prev => ({ ...prev, [event]: effect }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { id: `u-${Date.now()}`, role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Pattern-match commands locally (no API key needed for demo)
    const lower = input.toLowerCase();
    let matched = false;
    const eventKeywords: [string, string][] = [
      ["mão aberta", "HAND_OPEN"], ["mão fechada", "HAND_CLOSED"],
      ["mão direita", "RIGHT_HAND_UP"], ["mão esquerda", "LEFT_HAND_UP"],
      ["ambas as mãos", "BOTH_HANDS_UP"], ["em movimento", "HAND_MOVING"],
      ["mãos abertas", "HANDS_SPREAD"], ["pinça", "PINCH"],
    ];
    const effectKeywords: [string, string][] = [
      ["fogo", "FIRE"], ["relâmpago", "LIGHTNING"], ["portal", "PORTAL"],
      ["partícula", "PARTICLE_BURST"], ["aura", "ENERGY_AURA"],
      ["invisível", "INVISIBILITY_CLOAK"], ["nenhum", "NONE"],
    ];
    let matchedEvent = "";
    let matchedEffect = "";
    for (const [kw, ev] of eventKeywords) {
      if (lower.includes(kw)) { matchedEvent = ev; break; }
    }
    for (const [kw, ef] of effectKeywords) {
      if (lower.includes(kw)) { matchedEffect = ef; break; }
    }
    if (matchedEvent && matchedEffect) {
      setEffectMappings(prev => ({ ...prev, [matchedEvent]: matchedEffect }));
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: `✅ Configurado: ${matchedEvent} → ${matchedEffect}`
      }]);
      matched = true;
    }
    if (!matched) {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Não entendi. Tente: 'Quando eu abrir a mão, quero fogo' ou 'Coloque relâmpago na pinça'."
      }]);
    }
  };

  function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const canvas = document.querySelector("canvas");
      if (!canvas) { alert("Câmera não iniciada."); return; }
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;
      recordedChunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `echovisual-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      };
      recorder.start();
      setIsRecording(true);
    }
  }

  // Auto-clear quando o gesto CROSS_ARMS é detectado e mapeado para NONE
  useEffect(() => {
    if (lastEvent?.type === "CROSS_ARMS") {
      clearEffects();
    }
  }, [lastEvent]);

  const activeEventEffect = lastEvent ? (effectMappings[lastEvent.type] ?? "NONE") : null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-neutral-200 font-sans overflow-x-hidden">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between pb-5 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 blur-sm opacity-60" />
              <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">EchoVisual Studio</h1>
              <p className="text-xs text-neutral-500">Gesture · Vision · Reality</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRecording && (
              <span className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 px-3 py-1.5 rounded-full border border-rose-900/40 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                REC
              </span>
            )}
            {/* Capturar Fundo para efeito de invisibilidade */}
            <button
              onClick={captureBackground}
              disabled={!videoEl}
              title={!videoEl ? "Ative a câmera primeiro" : "Saia do enquadramento e capture o fundo vazio"}
              className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all duration-200 flex items-center gap-2 ${
                bgCaptured
                  ? "text-emerald-300 bg-emerald-950/30 border-emerald-800/50"
                  : videoEl
                    ? "text-neutral-300 bg-white/5 border-white/10 hover:bg-cyan-950/30 hover:border-cyan-800/50 hover:text-cyan-300"
                    : "text-neutral-600 bg-white/[0.02] border-white/5 cursor-not-allowed"
              }`}
            >
              {bgCaptured ? "✅ Fundo Salvo" : "📷 Capturar Fundo"}
            </button>
            <button
              onClick={clearEffects}
              title="Limpar todos os efeitos da tela (ou cruze os braços)"
              className="text-xs font-medium px-4 py-2 rounded-xl border transition-all duration-200 flex items-center gap-2 text-neutral-300 bg-white/5 border-white/10 hover:bg-amber-950/30 hover:border-amber-800/50 hover:text-amber-300"
            >
              🧹 Limpar
            </button>
            <button
              onClick={toggleRecording}
              className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all duration-200 flex items-center gap-2 ${
                isRecording
                  ? "text-rose-400 bg-rose-950/30 border-rose-800/50 hover:bg-rose-950/50"
                  : "text-neutral-300 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-rose-500" : "bg-neutral-400"}`} />
              {isRecording ? "Parar Gravação" : "Gravar"}
            </button>
          </div>
        </header>

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
          {/* Left: Stage */}
          <div className="space-y-4">
            {/* Stage Card */}
            <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-white/[0.02] backdrop-blur-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                  <span className="text-[11px] font-semibold tracking-widest text-neutral-500 uppercase">Stage</span>
                </div>
                <div className="flex items-center gap-2">
                  {numHands > 0 && (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-900/40">
                      {numHands === 1 ? "1 mão" : "2 mãos"} detectada{numHands > 1 ? "s" : ""}
                    </span>
                  )}
                  {activeEventEffect && activeEventEffect !== "NONE" && (
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${EFFECT_COLORS[activeEventEffect]} bg-white/5 border-white/10`}>
                      {activeEventEffect}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative aspect-video bg-black">
                <CameraPreview onStreamReady={setVideoEl} onStreamStop={() => setVideoEl(null)} />
                <VisualEngine
                  videoElement={videoEl}
                  lastEvent={lastEvent}
                  activeHands={activeHands}
                  effectMappings={effectMappings}
                  clearTrigger={clearTrigger}
                  backgroundTexture={backgroundTexture}
                />
                {videoEl && (
                  <SkeletonOverlay
                    results={results}
                    width={videoEl.videoWidth || 640}
                    height={videoEl.videoHeight || 480}
                  />
                )}
              </div>
            </div>

            {/* Event bar */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Câmera", ok: !!videoEl },
                { label: "MediaPipe", ok: isModelLoaded },
                { label: "EchoMotion", ok: !!lastEvent },
                { label: "R3F Engine", ok: !!videoEl },
              ].map(({ label, ok }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${ok ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-neutral-700"}`} />
                  <span className={`text-xs font-medium truncate ${ok ? "text-neutral-300" : "text-neutral-600"}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Last event monitor */}
            {mounted && (
              <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between min-h-[52px]">
                {lastEvent ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] animate-pulse" />
                      <span className="text-sm font-mono font-medium text-cyan-400">{lastEvent.type}</span>
                      <span className="text-xs text-neutral-500">→</span>
                      <span className={`text-sm font-medium ${EFFECT_COLORS[effectMappings[lastEvent.type] ?? "NONE"]}`}>
                        {effectMappings[lastEvent.type] ?? "NONE"}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-600 font-mono">
                      {(lastEvent.confidence * 100).toFixed(0)}% confiança
                    </span>
                  </>
                ) : (
                  <p className="text-xs text-neutral-600 italic mx-auto">Mova as mãos para iniciar...</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Control Panel */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex p-1 bg-white/[0.03] rounded-xl border border-white/5 gap-1">
              {(["editor", "ai"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-white/10 text-white"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab === "editor" ? "🎛️ Editor" : "🤖 AI Director"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "editor" ? (
              <EffectMappingEditor
                effectMappings={effectMappings}
                onChange={handleMappingChange}
              />
            ) : (
              <div className="p-5 bg-white/[0.02] border border-white/8 rounded-2xl space-y-4">
                <div>
                  <h2 className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase mb-1">AI Director</h2>
                  <p className="text-[11px] text-neutral-600">Fale com a IA para alterar mapeamentos de efeitos por voz escrita.</p>
                </div>
                <div className="h-52 overflow-y-auto space-y-3 bg-black/40 p-4 rounded-xl border border-white/5 text-xs">
                  {messages.length === 0 && (
                    <p className="text-neutral-600 italic text-center mt-8">
                      Experimente: "Quando eu abrir a mão, quero fogo"
                    </p>
                  )}
                  {messages.map(m => (
                    <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-violet-600/30 text-violet-200 border border-violet-800/50"
                          : "bg-white/5 text-neutral-300 border border-white/10"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500/60 transition-colors placeholder:text-neutral-600"
                    value={input}
                    placeholder="Comandar efeitos em linguagem natural..."
                    onChange={handleInputChange}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    ↑
                  </button>
                </form>
              </div>
            )}

            {/* Reset button */}
            <button
              onClick={() => setEffectMappings(DEFAULT_MAPPINGS)}
              className="w-full py-2.5 text-xs font-medium text-neutral-500 hover:text-neutral-300 border border-white/5 hover:border-white/10 rounded-xl transition-colors bg-white/[0.02] hover:bg-white/[0.04]"
            >
              Restaurar padrões
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
