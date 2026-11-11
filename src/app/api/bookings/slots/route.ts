import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "@/lib/env";
import { bookableDates } from "@/lib/booking";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Taken slots for the bookable window. No personal data leaves this endpoint. */
export async function GET() {
  if (!(await rateLimit(`slots:${await clientIp()}`, 60, 60))) return NextResponse.json({ taken: [] }, { status: 429 });
  const dates = bookableDates();
  if (!hasSupabase || dates.length === 0) return NextResponse.json({ taken: [] });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data } = await sb.rpc("taken_slots", { p_from: dates[0], p_to: dates[dates.length - 1] });
  return NextResponse.json(
    { taken: ((data ?? []) as { slot_date: string; slot_time: string }[]).map((r) => `${r.slot_date} ${r.slot_time}`) },
    { headers: { "cache-control": "no-store" } },
  );
}
