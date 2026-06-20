// Traduz mensagens técnicas de erro (Supabase/Postgres/rede) em texto amigável.
//
// O mesmo padrão já existia em AuthPage.jsx (dicionário + fallback genérico);
// aqui centralizamos para o resto do app. Regra de ouro: NUNCA expor a mensagem
// bruta do erro ao usuário — qualquer coisa não mapeada cai em `errors.generic`.
//
// Uso: friendlyErrorMessage(err, t)  → string já traduzida no idioma atual.

export function friendlyErrorMessage(err, t) {
  const raw = typeof err === 'string'
    ? err
    : (err?.message || err?.error_description || err?.msg || '');
  const text = String(raw).toLowerCase();

  const has = (...needles) => needles.some(n => text.includes(n));

  let key = 'errors.generic';

  if (has('duplicate key', 'already exists', 'unique constraint', 'violates unique')) {
    // Ex.: "duplicate key value violates unique constraint"
    key = 'errors.duplicateEntry';
  } else if (has('failed to fetch', 'fetch failed', 'network', 'timeout', 'timed out', 'load failed', 'networkerror')) {
    // Falha de rede/timeout entre o app e o Supabase.
    key = 'errors.network';
  } else if (has('jwt expired', 'token is expired', 'invalid token', 'refresh token', 'not authenticated', 'invalid claim')) {
    // Sessão/token expirado ou inválido.
    key = 'errors.sessionExpired';
  } else if (has('row-level security', 'row level security', 'permission denied', 'not authorized', 'violates row-level', 'rls')) {
    // Permissão negada (políticas RLS do Supabase).
    key = 'errors.permission';
  }

  return t(key);
}
