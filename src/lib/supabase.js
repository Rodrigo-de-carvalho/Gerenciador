import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico explícito: sem estas variáveis o app não consegue autenticar e
// fica preso no "carregando". Logar deixa a causa visível no console em vez de
// falhar em silêncio. No Vercel, configure VITE_SUPABASE_URL e
// VITE_SUPABASE_ANON_KEY em Settings → Environment Variables e refaça o deploy.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[Cifra] Configuração do Supabase ausente:',
    { temUrl: Boolean(supabaseUrl), temAnonKey: Boolean(supabaseAnonKey) },
    '— verifique as variáveis de ambiente no Vercel.'
  );
}

// Sem env vars, createClient() lança "supabaseKey is required." em tempo de
// import, o que derruba TODO o app para uma tela branca antes do React montar.
// Usamos placeholders inofensivos nesse caso para que o app continue subindo:
// o AuthContext libera a tela de login (não fica preso no spinner) e o erro
// acima fica visível no console apontando a causa real.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
