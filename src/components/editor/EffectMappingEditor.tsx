"use client";

const EVENTS = [
  "PALM_OPEN", "FIST_CLOSED", "THUMBS_UP", "VICTORY_SIGN",
  "PINCH", "SWIPE_LEFT", "SWIPE_RIGHT", "CROSS_ARMS",
  "RIGHT_HAND_UP", "LEFT_HAND_UP", "BOTH_HANDS_UP",
  "HAND_MOVING", "HANDS_SPREAD",
] as const;

const EFFECTS = [
  "NONE", "PARTICLE_BURST", "ENERGY_AURA", "PORTAL",
  "FIRE", "LIGHTNING", "INVISIBILITY_CLOAK"
] as const;

const EFFECT_LABELS: Record<string, string> = {
  NONE: "— Nenhum",
  PARTICLE_BURST: "💥 Partículas",
  ENERGY_AURA: "🔮 Aura de Energia",
  PORTAL: "🌀 Portal",
  FIRE: "🔥 Fogo",
  LIGHTNING: "⚡ Relâmpago",
  INVISIBILITY_CLOAK: "👻 Bolha Capa",
};

const EVENT_LABELS: Record<string, string> = {
  PALM_OPEN:      "✋ Palma Aberta",
  FIST_CLOSED:    "✊ Punho Fechado",
  THUMBS_UP:      "👍 Joinha",
  VICTORY_SIGN:   "✌️ Sinal de Paz",
  PINCH:          "🤌 Pinça (polegar+índex)",
  SWIPE_LEFT:     "👈 Deslizar Esquerda",
  SWIPE_RIGHT:    "👉 Deslizar Direita",
  CROSS_ARMS:     "🙅 Braços Cruzados (X)",
  RIGHT_HAND_UP:  "🤚 Mão Dir. no Ar",
  LEFT_HAND_UP:   "🤚 Mão Esq. no Ar",
  BOTH_HANDS_UP:  "🙌 Ambas as Mãos",
  HAND_MOVING:    "👋 Mão em Movimento",
  HANDS_SPREAD:   "🤲 Mãos Afastadas",
};

interface EffectMappingEditorProps {
  effectMappings: Record<string, string>;
  onChange: (event: string, effect: string) => void;
}

export function EffectMappingEditor({ effectMappings, onChange }: EffectMappingEditorProps) {
  return (
    <div className="p-4 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
      <h2 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-3">
        Mapeamento de Gestos
      </h2>
      <div className="space-y-2">
        {EVENTS.map((event) => {
          const currentEffect = effectMappings[event] ?? "NONE";
          const isActive = currentEffect !== "NONE";
          return (
            <div
              key={event}
              className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${
                isActive ? "bg-white/[0.04]" : ""
              }`}
            >
              <span className={`text-xs w-36 shrink-0 truncate ${isActive ? "text-neutral-300" : "text-neutral-600"}`}>
                {EVENT_LABELS[event]}
              </span>
              <div className="flex-1 relative">
                <select
                  value={currentEffect}
                  onChange={(e) => onChange(event, e.target.value)}
                  className={`w-full appearance-none rounded-lg px-2.5 py-1.5 text-xs focus:outline-none transition-colors cursor-pointer pr-6 ${
                    isActive
                      ? "bg-neutral-800 border border-violet-800/60 text-neutral-200 focus:border-violet-500"
                      : "bg-neutral-950 border border-neutral-800 text-neutral-500 focus:border-neutral-600"
                  }`}
                >
                  {EFFECTS.map((effect) => (
                    <option key={effect} value={effect}>
                      {EFFECT_LABELS[effect]}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg className="w-3 h-3 text-neutral-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
