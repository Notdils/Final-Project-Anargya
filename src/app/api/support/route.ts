import { NextResponse } from "next/server";
import { currentUser, supabaseService } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { MSG_COLS, cleanBody, toMessage } from "@/lib/support";
import { AUTO_BOOK, AUTO_REPLY, isTopic } from "@/lib/support-topics";

const notReady = () => NextResponse.json({ error: "Chat is not available right now." }, { status: 503 });

/** The signed-in customer's conversation with the team (empty until they write). Marks staff replies as seen.
 *  Staff names are hidden: customers see every reply as "Anargya Team". */
export async function GET() {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in to chat with us.", login: true }, { status: 401 });
  const sb = supabaseService();
  if (!sb) return notReady();
  const th = await sb.from("support_threads").select("id, customer_unread").eq("user_id", user.id).maybeSingle();
  if (th.error) return notReady();
  if (!th.data) return NextResponse.json({ messages: [] });
  const m = await sb.from("support_messages").select(MSG_COLS).eq("thread_id", th.data.id).order("created_at").limit(300);
  if (m.error) return notReady();
  if (th.data.customer_unread) await sb.from("support_threads").update({ customer_unread: false }).eq("id", th.data.id);
  return NextResponse.json({ messages: (m.data ?? []).map((r) => ({ ...toMessage(r), staffName: null })) });
}

/** Send a message to the team. Creates the conversation on the first message.
 *  With a topic (from a topic chip) the team's automatic reply that points to booking is added right after. */
export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in to chat with us.", login: true }, { status: 401 });
  const input = await req.json().catch(() => null);
  const body = cleanBody(input?.body);
  const raw: unknown = input?.topic;
  const topic = isTopic(raw) ? raw : null;
  if (!body) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  if (!(await rateLimit(`support:${user.id}`, 20, 600))) return NextResponse.json({ error: "Too many messages. Wait a few minutes." }, { status: 429 });
  const sb = supabaseService();
  if (!sb) return notReady();
  const meta = (user.user_metadata ?? {}) as { full_name?: string };
  const now = new Date().toISOString();
  const th = await sb.from("support_threads")
    .upsert({ user_id: user.id, customer_email: user.email ?? null, customer_name: meta.full_name ?? null, last_message_at: now, staff_unread: true }, { onConflict: "user_id" })
    .select("id").single();
  if (th.error) return notReady();
  const m = await sb.from("support_messages")
    .insert({ thread_id: th.data.id, sender: "customer", body, kind: topic ? "topic" : "text", meta: topic ? { topic } : null })
    .select(MSG_COLS).single();
  if (m.error) return NextResponse.json({ error: "Could not send. Try again." }, { status: 500 });
  const out = [toMessage(m.data)];
  if (topic) {
    const a = await sb.from("support_messages")
      .insert({ thread_id: th.data.id, sender: "staff", staff_name: "Auto-reply", body: `${AUTO_REPLY[topic]} ${AUTO_BOOK}`, kind: "auto", meta: { topic } })
      .select(MSG_COLS).single();
    if (!a.error) out.push(toMessage(a.data));
  }
  return NextResponse.json({ messages: out.map((x) => ({ ...x, staffName: null })) });
}
