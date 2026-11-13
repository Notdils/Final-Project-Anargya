import { NextResponse } from "next/server";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Admin only: delete a whole conversation for both sides (customer panel and Inbox). Cannot be undone.
 *  The customer's next message starts a new conversation. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("support.delete");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!UUID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const th = await sb.from("support_threads").select("customer_email").eq("id", id).maybeSingle();
  if (th.error) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  if (!th.data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const { count } = await sb.from("support_messages").select("id", { count: "exact", head: true }).eq("thread_id", id);
  const del = await sb.from("support_threads").delete().eq("id", id); // messages go with it (on delete cascade)
  if (del.error) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  await audit(g.user!, "support.delete", id, { customer: th.data.customer_email, messages: count ?? null });
  return NextResponse.json({ ok: true });
}
