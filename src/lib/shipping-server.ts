import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase, shippingUsd } from "@/lib/env";
import { fallbackZones, type Region, type ShippingData, type Zone } from "@/lib/shipping";
import type { SupabaseClient } from "@supabase/supabase-js";

type ZoneRow = { code: string; kind: Zone["kind"]; name: string; rate_usd: number | string | null; min_days: number | null; max_days: number | null; active: boolean; region?: string | null };
const toZone = (r: ZoneRow): Zone => ({ code: r.code, kind: r.kind, name: r.name, rateUsd: r.rate_usd === null ? null : Number(r.rate_usd), minDays: r.min_days, maxDays: r.max_days, active: r.active, region: r.region ?? null });
const ZONE_COLS = "code, kind, name, rate_usd, min_days, max_days, active, region";
const ZONE_COLS_OLD = "code, kind, name, rate_usd, min_days, max_days, active"; // before 0025

/** DHL regions with their per-part rates (0025). Empty before that migration runs. */
async function regions(sb: SupabaseClient): Promise<Region[]> {
  const [r, rates] = await Promise.all([
    sb.from("shipping_regions").select("code, name, dhl_zone, min_days, max_days").order("sort"),
    sb.from("shipping_rates").select("region, product_id, rate_usd"),
  ]);
  if (r.error || rates.error) return [];
  return (r.data ?? []).map((x) => ({
    code: x.code, name: x.name, dhlZone: x.dhl_zone, minDays: x.min_days, maxDays: x.max_days,
    rates: Object.fromEntries((rates.data ?? []).filter((y) => y.region === x.code).map((y) => [y.product_id, Number(y.rate_usd)])),
  }));
}

async function zones(sb: SupabaseClient, activeOnly: boolean) {
  const run = (cols: string) => {
    let q = sb.from("shipping_zones").select(cols);
    if (activeOnly) q = q.eq("active", true);
    return q.order("kind", { ascending: false }).order("code");
  };
  let z = await run(ZONE_COLS);
  if (z.error) z = await run(ZONE_COLS_OLD);
  return z.error || !z.data?.length ? null : (z.data as unknown as ZoneRow[]).map(toZone);
}

/** Active zones (public data, read without a session). Falls back to the seed list before SQL 0013 runs. */
export async function shippingData(): Promise<ShippingData> {
  const flatUsd = shippingUsd();
  if (!hasSupabase) return { zones: fallbackZones(), regions: [], flatUsd };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const [z, r] = await Promise.all([zones(sb, true), regions(sb)]);
  return { zones: z ?? fallbackZones(), regions: r, flatUsd };
}

/** Every zone, active or not (Admin → Shipping). */
export async function allZones(): Promise<{ zones: Zone[]; regions: Region[]; flatUsd: number; live: boolean }> {
  const flatUsd = shippingUsd();
  const { supabaseService } = await import("@/lib/supabase/server");
  const sb = supabaseService();
  if (!sb) return { zones: fallbackZones(), regions: [], flatUsd, live: false };
  const [z, r] = await Promise.all([zones(sb, false), regions(sb)]);
  if (!z) return { zones: fallbackZones(), regions: [], flatUsd, live: false };
  return { zones: z, regions: r, flatUsd, live: true };
}
