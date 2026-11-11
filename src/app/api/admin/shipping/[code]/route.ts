import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

const days = z.number().int().min(0).max(120).nullable();
const Body = z
  .object({ rate_usd: z.number().min(0).max(100000).multipleOf(0.01).nullable(), min_days: days, max_days: days, active: z.boolean() })
  .refine((b) => b.min_days === null || b.max_days === null || b.min_days <= b.max_days, { path: ["max_days"], message: "Must be at least the minimum." });

/** Update one shipping zone: rate (null = flat fallback), delivery days, on/off. */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await guardApi("shipping.manage");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z]{2}(-[A-Z]+)?$/.test(code)) return NextResponse.json({ error: "bad code" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const upd = { ...parsed.data, updated_at: new Date().toISOString() };
  const { data, error } = await sb.from("shipping_zones").update(upd).eq("code", code).select("code").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Zone not found." }, { status: 404 });
  await audit(g.user!, "shipping.update", code, parsed.data);
  return NextResponse.json({ ok: true });
}
