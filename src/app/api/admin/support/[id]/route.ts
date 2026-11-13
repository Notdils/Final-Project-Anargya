import { NextResponse } from "next/server";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { MSG_COLS, cleanBody, toMessage } from "@/lib/support";
import { listProducts } from "@/lib/catalog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One conversation. Opening it marks the customer's messages as read by staff. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("support.reply");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!UUID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const m = await sb.from("support_messages").select(MSG_COLS).eq("thread_id", id).order("created_at").limit(500);
  if (m.error) return NextResponse.json({ error: "Could not load." }, { status: 500 });
  const th = await sb.from("support_threads").update({ staff_unread: false }).eq("id", id).select("customer_reset_at").maybeSingle();
  return NextResponse.json({ messages: (m.data ?? []).map(toMessage), resetAt: th.data?.customer_reset_at ?? null });
}

/** Reply as staff. The customer sees it the next time their chat panel refreshes. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("support.reply");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!UUID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const input = await req.json().catch(() => null);
  // Either a text reply or a product card (snapshot of name, price and image at the time it is sent).
  let body = cleanBody(input?.body);
  let kind: "text" | "product" = "text";
  let meta: Record<string, unknown> | null = null;
  if (typeof input?.product === "string") {
    const p = (await listProducts()).find((x) => x.slug === input.product);
    if (!p) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    kind = "product";
    meta = { slug: p.slug, name: p.name, priceUsd: p.priceUsd, image: p.image };
    body = p.name;
  }
  if (!body) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const staffName = ((g.user!.user_metadata ?? {}) as { full_name?: string }).full_name?.split(" ")[0] || "Anargya Team";
  const th = await sb.from("support_threads").update({ last_message_at: new Date().toISOString(), staff_unread: false, customer_unread: true }).eq("id", id).select("id").maybeSingle();
  if (th.error) return NextResponse.json({ error: "Could not send." }, { status: 500 });
  if (!th.data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const m = await sb.from("support_messages").insert({ thread_id: id, sender: "staff", staff_id: g.user!.id, staff_name: staffName, body, kind, meta }).select(MSG_COLS).single();
  if (m.error) return NextResponse.json({ error: "Could not send." }, { status: 500 });
  await audit(g.user!, "support.reply", id, { kind, length: body.length });
  return NextResponse.json({ message: toMessage(m.data) });
}
