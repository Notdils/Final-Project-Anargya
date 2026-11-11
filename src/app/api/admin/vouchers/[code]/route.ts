import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

/** Turn a voucher on or off. Vouchers are never deleted, so past orders keep their code. */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await guardApi("products.write");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const code = (await params).code.toUpperCase();
  const parsed = z.object({ active: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !/^[A-Z0-9-]{3,24}$/.test(code)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { data, error } = await sb.from("vouchers").update({ active: parsed.data.active }).eq("code", code).select("code").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
  await audit(g.user!, parsed.data.active ? "voucher.enable" : "voucher.disable", code, {});
  return NextResponse.json({ ok: true });
}
