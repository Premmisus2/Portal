// Premmisus Sales Portal — Server-side admin gate
//
// Verifies the caller is a director by:
//   1. Pulling the access token from the Authorization: Bearer header
//   2. Calling supabase.auth.getUser(token) with the anon client to validate
//   3. Looking up reps.role via the service-role client
//
// Returns a discriminated union so the route can `return NextResponse.json(...)`
// directly on auth failure without nested branches.

import { createClient } from '@supabase/supabase-js';

export type DirectorAuth =
  | { ok: true; repId: string; email: string }
  | { ok: false; status: number; error: string };

export async function requireDirector(request: Request): Promise<DirectorAuth> {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'Missing access token' };

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !anonKey || !serviceKey) {
    return { ok: false, status: 500, error: 'Auth not configured' };
  }

  const authClient = createClient(sbUrl, anonKey);
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return { ok: false, status: 401, error: 'Invalid access token' };
  }

  const admin = createClient(sbUrl, serviceKey);
  const { data: rep, error: repErr } = await admin
    .from('reps')
    .select('id, role')
    .eq('email', userData.user.email)
    .maybeSingle();
  if (repErr) return { ok: false, status: 500, error: 'Rep lookup failed' };
  if (!rep) return { ok: false, status: 403, error: 'Rep not found' };
  if (rep.role !== 'director') return { ok: false, status: 403, error: 'Director only' };

  return { ok: true, repId: rep.id, email: userData.user.email };
}
