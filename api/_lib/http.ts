export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function fail(message: string, status = 400, code?: string): Response {
  return json({ error: message, code }, status);
}

/**
 * Quando o Supabase está configurado, só contas logadas podem usar as rotas de IA
 * (assim ninguém de fora gasta as suas chaves). No modo local a rota fica aberta.
 * Retorna uma Response de erro, ou null se a requisição pode seguir.
 */
export async function requireUser(request: Request): Promise<Response | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return fail('Faça login para usar a edição com IA.', 401);
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: auth } });
  if (!res.ok) return fail('Sua sessão expirou. Entre de novo.', 401);
  return null;
}
