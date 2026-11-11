import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

const Body = z.object({
  fulfilment_status: z.enum(["to_pack", "shipped", "delivered"]),
  carrier: z.string().trim().max(60).optional().default(""),
  tracking_no: z.string().trim().max(60).regex(/^[A-Za-z0-9 -]*$/, "Letters, numbers, spaces and dashes only.").optional().default(""),
});

/** Set packing / shipping status of a paid order. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("orders.fulfil");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const b = parsed.data;
  if (b.fulfilment_status !== "to_pack" && (!b.carrier || !b.tracking_no))
    return NextResponse.json({ error: "Add the carrier and tracking number first.", fields: { ...(!b.carrier ? { carrier: ["Required."] } : {}), ...(!b.tracking_no ? { tracking_no: ["Required."] } : {}) } }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { data: cur } = await sb.from("orders").select("status, shipped_at, delivered_at").eq("id", id).maybeSingle();
  if (!cur) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (cur.status !== "paid") return NextResponse.json({ error: "Only paid orders can be packed or shipped." }, { status: 409 });
  const now = new Date().toISOString();
  const upd = {
    fulfilment_status: b.fulfilment_status,
    carrier: b.carrier || null,
    tracking_no: b.tracking_no || null,
    shipped_at: b.fulfilment_status === "to_pack" ? null : cur.shipped_at ?? now,
    delivered_at: b.fulfilment_status === "delivered" ? cur.delivered_at ?? now : null,
  };
  const { error } = await sb.from("orders").update(upd).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  await audit(g.user!, "order.fulfilment", id, upd);
  return NextResponse.json({ ok: true, ...upd });
}
