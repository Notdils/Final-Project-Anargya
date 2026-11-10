import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().email().max(120) });

// Always answers the same way, so the form cannot be used to find out which emails have accounts.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const ip = await clientIp();
  if (!(await rateLimit(`forgot:${ip}`, 5, 900)) || !(await rateLimit(`forgot:${email}`, 3, 900)))
    return NextResponse.json({ error: "Too many requests. Try again in 15 minutes." }, { status: 429 });

  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: "Password reset is not configured yet." }, { status: 503 });
  const origin = new URL(req.url).origin;
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  return NextResponse.json({ ok: true });
}
