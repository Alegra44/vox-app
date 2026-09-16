import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Client scoped to the caller's own JWT. RLS (spec §5.3) is the real
 * authorization boundary here — every query still runs as "this user",
 * so a bug in route logic can't leak another user's row.
 */
export function userClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

/**
 * Anon-key client with no caller JWT — for routes reachable by signed-out
 * users (e.g. the feedback form). RLS (spec §5.3-style policies) is the real
 * authorization boundary: this can only do whatever the anon role's policies
 * allow, same as a browser with just the public anon key.
 */
export function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS. Only for contexts with no user JWT,
 * i.e. the Stripe webhook (§6.3), which must write to an arbitrary user's
 * subscription_plan based on the Stripe customer ID, not the caller's own row.
 */
export function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const client = userClient(authHeader);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
