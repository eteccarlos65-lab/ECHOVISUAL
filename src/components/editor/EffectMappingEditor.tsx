"use client";

const EVENTS = [
  "HAND_OPEN", "HAND_CLOSED", "RIGHT_HAND_UP", "LEFT_HAND_UP",
  "BOTH_HANDS_UP", "HAND_MOVING", "HANDS_SPREAD", "PINCH"
] as const;

const EFFECTS = [
  "NONE", "PARTICLE_BURST", "ENERGY_AURA", "PORTAL",
  "FIRE", "LIGHTNING", "INVISIBILITY_CLOAK"
] as const;

const EFFECT_LABELS: Record<string, string> = {
  NONE: "Nenhum",
  PARTICLE_BURST: "💥 Partículas",
  ENERGY_AURA: "🔮 Aura de Energia",
  PORTAL: "🌀 Portal",
  FIRE: "🔥 Fogo",
  LIGHTNING: "⚡ Relâmpago",
  INVISIBILITY_CLOAK: "👻 Capa Invisível",
};

const EVENT_LABELS: Record<string, string> = {
  HAND_OPEN: "✋ Mão Aberta",
  HAND_CLOSED: "✊ Mão Fechada",
  RIGHT_HAND_UP: "🤚 Mão Dir. Levantada",
  LEFT_HAND_UP: "🤚 Mão Esq. Levantada",
  BOTH_HANDS_UP: "🙌 Ambas as Mãos",
  HAND_MOVING: "👋 Mão em Movimento",
  HANDS_SPREAD: "🤲 Mãos Abertas",
  PINCH: "🤌 Pinça",
};

interface EffectMappingEditorProps {
  effectMappings: Record<string, string>;
  onChange: (event: string, effect: string) => void;
}

export function EffectMappingEditor({ effectMappings, onChange }: EffectMappingEditorProps) {
  return (
    <div className="p-5 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
      <h2 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-4">
        Editor de Efeitos
      </h2>
      <div className="space-y-2.5">
        {EVENTS.map((event) => {
          const currentEffect = effectMappings[event] ?? "NONE";
          return (
            <div key={event} className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 w-36 shrink-0 truncate">
                {EVENT_LABELS[event]}
              </span>
              <div className="flex-1 relative">
                <select
                  value={currentEffect}
                  onChange={(e) => onChange(event, e.target.value)}
                  className="w-full appearance-none bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer pr-7"
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
