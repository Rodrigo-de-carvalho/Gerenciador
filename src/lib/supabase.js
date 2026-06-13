import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico explícito: sem estas variáveis o app não consegue autenticar e
// fica preso no "carregando". Logar deixa a causa visível no console em vez de
// falhar em silêncio. No Vercel, configure VITE_SUPABASE_URL e
// VITE_SUPABASE_ANON_KEY em Settings → Environment Variables e refaça o deploy.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Cifra] Configuração do Supabase ausente:',
    { temUrl: Boolean(supabaseUrl), temAnonKey: Boolean(supabaseAnonKey) },
    '— verifique as variáveis de ambiente no Vercel.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
