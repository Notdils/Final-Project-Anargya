import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(80),
    email: z.string().email("Enter a valid email.").max(120),
    password: z.string().min(8, "At least 8 characters.").max(200),
    confirm: z.string(),
    terms: z.literal(true, { error: "Accept the terms to continue." }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export async function POST(req: Request) {
  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600)))
    return NextResponse.json({ error: "Too many sign-ups from this network. Try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: "Registration is not configured yet." }, { status: 503 });

  const origin = new URL(req.url).origin;
  // Role is never taken from user input: new accounts have no app_metadata.role, which means "customer".
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name }, emailRedirectTo: `${origin}/auth/callback?next=/marketplace` },
  });
  // One message for every failure, so the form does not reveal which emails already have an account.
  if (error) return NextResponse.json({ error: "Could not create the account. If you already have one, log in or reset your password." }, { status: 400 });
  return NextResponse.json({ confirm: !data.session, redirect: "/marketplace" });
}
