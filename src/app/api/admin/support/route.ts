import { NextResponse } from "next/server";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";

/** Admin → Inbox: conversations, newest first, with the last message as a preview. */
export async function GET() {
  const g = await guardApi("support.reply");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ threads: [], live: false });
  const th = await sb.from("support_threads").select("id, customer_email, customer_name, last_message_at, staff_unread").order("last_message_at", { ascending: false }).limit(100);
  if (th.error) return NextResponse.json({ threads: [], live: false });
  const ids = (th.data ?? []).map((t) => t.id);
  const last = new Map<string, string>();
  if (ids.length) {
    const m = await sb.from("support_messages").select("thread_id, body, created_at").in("thread_id", ids).order("created_at", { ascending: false }).limit(500);
    for (const r of m.data ?? []) if (!last.has(r.thread_id)) last.set(r.thread_id, r.body);
  }
  return NextResponse.json({
    live: true,
    threads: (th.data ?? []).map((t) => ({ id: t.id, email: t.customer_email, name: t.customer_name, lastAt: t.last_message_at, staffUnread: t.staff_unread, preview: last.get(t.id)?.slice(0, 120) ?? null })),
  });
}
