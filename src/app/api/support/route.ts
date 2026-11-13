import { NextResponse } from "next/server";
import { currentUser, supabaseService } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { cleanBody, toMessage } from "@/lib/support";

const notReady = () => NextResponse.json({ error: "Chat is not available right now." }, { status: 503 });

/** The signed-in customer's conversation with the team (empty until they write). Marks staff replies as seen. */
export async function GET() {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in to chat with us.", login: true }, { status: 401 });
  const sb = supabaseService();
  if (!sb) return notReady();
  const th = await sb.from("support_threads").select("id, customer_unread").eq("user_id", user.id).maybeSingle();
  if (th.error) return notReady();
  if (!th.data) return NextResponse.json({ messages: [] });
  const m = await sb.from("support_messages").select("id, sender, staff_name, body, created_at").eq("thread_id", th.data.id).order("created_at").limit(300);
  if (th.data.customer_unread) await sb.from("support_threads").update({ customer_unread: false }).eq("id", th.data.id);
  return NextResponse.json({ messages: (m.data ?? []).map(toMessage) });
}

/** Send a message to the team. Creates the conversation on the first message. */
export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in to chat with us.", login: true }, { status: 401 });
  const body = cleanBody((await req.json().catch(() => null))?.body);
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
  const m = await sb.from("support_messages").insert({ thread_id: th.data.id, sender: "customer", body }).select("id, sender, staff_name, body, created_at").single();
  if (m.error) return NextResponse.json({ error: "Could not send. Try again." }, { status: 500 });
  return NextResponse.json({ message: toMessage(m.data) });
}
