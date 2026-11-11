import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { clientIp, hit, rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

const Body = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(200), next: z.string().optional() });
const MAX = 5;
const WINDOW = 300; // 5 failed attempts per 5 minutes per email+IP


export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: "Login is not configured yet." }, { status: 503 });

  const email = parsed.data.email.toLowerCase();
  const ip = await clientIp();
  // Separate caps per email (password spraying from many IPs) and per IP (one IP trying many emails).
  if (!(await rateLimit(`login-email:${email}`, 20, 3600)) || !(await rateLimit(`login-ip:${ip}`, 30, 600)))
    return NextResponse.json({ error: "Too many attempts. Try again later.", locked: true }, { status: 429 });
  const key = `login:${email}:${ip}`;
  const tries = await hit(`${key}:peek`, WINDOW); // counts attempts, including successful ones
  if (tries > MAX) return NextResponse.json({ error: "Too many attempts. Try again in 5 minutes.", locked: true }, { status: 429 });

  const { data, error } = await sb.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error || !data.user) {
    const left = Math.max(0, MAX - tries);
    return NextResponse.json(
      { error: left > 0 ? `Email or password is incorrect. ${left} attempt${left === 1 ? "" : "s"} left before a 5-minute lock.` : "Too many attempts. Try again in 5 minutes.", locked: left === 0, left },
      { status: 401 },
    );
  }
  const role = (data.user.app_metadata as { role?: string }).role === "admin" ? "admin" : "customer";
  return NextResponse.json({ redirect: safeNext(parsed.data.next) ?? (role === "admin" ? "/admin" : "/marketplace") });
}
