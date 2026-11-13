import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

const days = z.number().int().min(0).max(120).nullable();
const Body = z
  .object({
    min_days: days,
    max_days: days,
    // product id -> USD per box. Parts left out keep no rate (checkout uses the flat rate for them).
    rates: z.record(z.string().regex(/^[a-z0-9-]{3,60}$/), z.number().min(0).max(100000).multipleOf(0.01)),
  })
  .refine((b) => b.min_days === null || b.max_days === null || b.min_days <= b.max_days, { path: ["max_days"], message: "Must be at least the minimum." });

/** Update one DHL region (0025): delivery days and the rate per box for each part. */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await guardApi("shipping.manage");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z_]{3,30}$/.test(code)) return NextResponse.json({ error: "bad code" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the values.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const now = new Date().toISOString();
  const { min_days, max_days, rates } = parsed.data;

  const r = await sb.from("shipping_regions").update({ min_days, max_days, updated_at: now }).eq("code", code).select("code").maybeSingle();
  if (r.error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  if (!r.data) return NextResponse.json({ error: "Region not found." }, { status: 404 });

  const rows = Object.entries(rates).map(([product_id, rate_usd]) => ({ region: code, product_id, rate_usd, updated_at: now }));
  const del = await sb.from("shipping_rates").delete().eq("region", code).not("product_id", "in", `(${rows.map((x) => `"${x.product_id}"`).join(",") || '""'})`);
  if (del.error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  if (rows.length) {
    const up = await sb.from("shipping_rates").upsert(rows, { onConflict: "region,product_id" });
    if (up.error) return NextResponse.json({ error: up.error.code === "23503" ? "Unknown part." : "Could not save." }, { status: up.error.code === "23503" ? 400 : 500 });
  }
  await audit(g.user!, "shipping.region.update", code, parsed.data);
  return NextResponse.json({ ok: true });
}
