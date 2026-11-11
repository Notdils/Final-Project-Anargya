"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasSupabase } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (!hasSupabase) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { cookieOptions: { secure: location.protocol === "https:" } });
  return client;
}
