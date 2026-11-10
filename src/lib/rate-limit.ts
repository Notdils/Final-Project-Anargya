import "server-only";
import { headers } from "next/headers";
import { supabaseService } from "@/lib/supabase/server";

// Fallback for local dev without Supabase: per-instance memory (not shared across serverless instances).
const mem = new Map<string, { start: number; hits: number }>();

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** Fixed-window counter. Returns hits so far in this window (including this one). */
export async function hit(key: string, windowSeconds: number): Promise<number> {
  const sb = supabaseService();
  if (sb) {
    const { data, error } = await sb.rpc("hit_rate_limit", { p_key: key, p_window_seconds: windowSeconds });
    if (!error && typeof data === "number") return data;
  }
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || now - cur.start > windowSeconds * 1000) {
    mem.set(key, { start: now, hits: 1 });
    return 1;
  }
  cur.hits += 1;
  return cur.hits;
}

/** Returns true when the request is allowed. */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  return (await hit(key, windowSeconds)) <= max;
}
