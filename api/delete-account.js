export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autorizado' });

  const token = authHeader.slice(7);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Servidor mal configurado — variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias.' });
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });

  if (!userRes.ok) return res.status(401).json({ error: 'Token inválido ou sessão expirada.' });

  const userData = await userRes.json();
  const userId = userData.id;
  if (!userId) return res.status(401).json({ error: 'Usuário não encontrado.' });

  const tables = ['transactions', 'categories', 'projects', 'cards', 'budgets', 'goals', 'investments', 'recurring'];
  // Apaga os dados de cada tabela; aborta se alguma falhar para não deixar
  // registros órfãos depois de remover o usuário do Auth.
  for (const table of tables) {
    const delRes = await fetch(`${supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, Prefer: 'return=minimal' },
    });
    if (!delRes.ok) {
      const detail = await delRes.text().catch(() => '');
      console.error(`[api/delete-account] falha ao limpar "${table}":`, delRes.status, detail);
      return res.status(500).json({ error: 'Não foi possível remover todos os seus dados. Tente novamente.' });
    }
  }

  const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });

  if (!deleteRes.ok) {
    const errText = await deleteRes.text().catch(() => '');
    console.error('[api/delete-account] falha ao remover usuário:', deleteRes.status, errText);
    return res.status(500).json({ error: 'Erro ao remover conta. Tente novamente.' });
  }

  res.json({ success: true });
}
