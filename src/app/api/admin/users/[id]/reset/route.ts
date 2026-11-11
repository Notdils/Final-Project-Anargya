import { NextResponse } from "next/server";
import { guardApi } from "@/lib/admin-guard";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

/** Send a password reset email to a user (admins only). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("users.manage");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  if (!(await rateLimit(`admin-reset:${id}`, 3, 3600))) return NextResponse.json({ error: "Already sent several times this hour." }, { status: 429 });
  const svc = supabaseService(); const sb = await supabaseServer();
  if (!svc || !sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { data } = await svc.auth.admin.getUserById(id);
  const email = data?.user?.email;
  if (!email) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const origin = new URL(req.url).origin;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  if (error) return NextResponse.json({ error: "Could not send the email." }, { status: 500 });
  await audit(g.user!, "user.password_reset", id, { email });
  return NextResponse.json({ ok: true });
}
