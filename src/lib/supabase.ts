import { createClient } from "@supabase/supabase-js";

// Estas variáveis de ambiente DEVEM estar no .env.local
// NENHUMA key real deve ser colocada aqui (Etapa 7).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Interfaces para tipagem
export interface Preset {
  id: string;
  user_id?: string;
  command_trigger: string;
  effect_name: string;
  target: string;
  created_at?: string;
}

export interface Log {
  id: string;
  user_id?: string;
  action: string;
  timestamp: string;
}
