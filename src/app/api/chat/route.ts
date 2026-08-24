import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const eventEnum = z.enum([
  "RIGHT_HAND_UP", "LEFT_HAND_UP", "BOTH_HANDS_UP", "HAND_MOVING",
  "HAND_OPEN", "HAND_CLOSED", "HANDS_SPREAD", "PINCH"
]);

const effectEnum = z.enum([
  "ENERGY_AURA", "PARTICLE_BURST", "PORTAL", "FIRE",
  "LIGHTNING", "INVISIBILITY_CLOAK", "NONE"
]);

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash"),
    messages,
    system: `
      Você é a inteligência artificial do EchoVisual Studio. 
      Sua função é entender o que o usuário quer e ajustar as configurações visuais mapeando EVENTOS para EFEITOS.
      Eventos disponíveis: "RIGHT_HAND_UP", "LEFT_HAND_UP", "BOTH_HANDS_UP", "HAND_MOVING", "HAND_OPEN", "HAND_CLOSED", "HANDS_SPREAD", "PINCH".
      Efeitos disponíveis: "ENERGY_AURA", "PARTICLE_BURST", "PORTAL", "FIRE", "LIGHTNING", "INVISIBILITY_CLOAK", "NONE".
      
      Sempre que o usuário pedir para mudar um efeito, use a tool "updateMapping".
      Seja breve nas suas respostas (1 frase confirmando a ação).
    `,
    tools: {
      updateMapping: {
        description: "Atualiza o mapeamento de qual Efeito Visual é engatilhado por qual Evento de movimento.",
        inputSchema: z.object({
          event: eventEnum.describe("O evento físico de gatilho"),
          effect: effectEnum.describe("O efeito visual que deve ser ativado"),
        }),
        execute: async (args: { event: z.infer<typeof eventEnum>; effect: z.infer<typeof effectEnum> }) => {
          return {
            success: true,
            message: `Mapeamento atualizado: ${args.event} -> ${args.effect}`
          };
        },
      },
    },
  });

  return result.toTextStreamResponse();
}
