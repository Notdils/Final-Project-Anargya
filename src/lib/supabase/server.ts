import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasSupabase } from "@/lib/env";

/** Session-aware client for Server Components, Route Handlers and Server Actions. RLS applies. */
export async function supabaseServer() {
  if (!hasSupabase) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component: cookies are read-only there, middleware refreshes them
        }
      },
    },
  });
}

/**
 * Service-role client. Server only, never imported by client code.
 * Used for: event ingestion, Midtrans webhook, admin exports.
 */
export function supabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasSupabase || !key) return null;
  return createPlainClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

export type Role = "customer" | "admin";

export async function currentUser() {
  const sb = await supabaseServer();
  if (!sb) return { user: null, role: null as Role | null };
  const { data } = await sb.auth.getUser();
  const user = data.user;
  const role = ((user?.app_metadata as { role?: Role } | undefined)?.role ?? (user ? "customer" : null)) as Role | null;
  return { user, role };
}
