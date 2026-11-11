import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase, shippingUsd } from "@/lib/env";
import { fallbackZones, type ShippingData, type Zone } from "@/lib/shipping";

type ZoneRow = { code: string; kind: Zone["kind"]; name: string; rate_usd: number | string | null; min_days: number | null; max_days: number | null; active: boolean };
const toZone = (r: ZoneRow): Zone => ({ code: r.code, kind: r.kind, name: r.name, rateUsd: r.rate_usd === null ? null : Number(r.rate_usd), minDays: r.min_days, maxDays: r.max_days, active: r.active });

/** Active zones (public data, read without a session). Falls back to the seed list before SQL 0013 runs. */
export async function shippingData(): Promise<ShippingData> {
  const flatUsd = shippingUsd();
  if (!hasSupabase) return { zones: fallbackZones(), flatUsd };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const z = await sb.from("shipping_zones").select("code, kind, name, rate_usd, min_days, max_days, active").eq("active", true);
  if (z.error || !z.data?.length) return { zones: fallbackZones(), flatUsd };
  return { zones: (z.data as ZoneRow[]).map(toZone), flatUsd };
}

/** Every zone, active or not (Admin → Shipping). */
export async function allZones(): Promise<{ zones: Zone[]; flatUsd: number; live: boolean }> {
  const flatUsd = shippingUsd();
  const { supabaseService } = await import("@/lib/supabase/server");
  const sb = supabaseService();
  if (!sb) return { zones: fallbackZones(), flatUsd, live: false };
  const z = await sb.from("shipping_zones").select("code, kind, name, rate_usd, min_days, max_days, active").order("kind", { ascending: false }).order("code");
  if (z.error || !z.data?.length) return { zones: fallbackZones(), flatUsd, live: false };
  return { zones: (z.data as ZoneRow[]).map(toZone), flatUsd, live: true };
}
