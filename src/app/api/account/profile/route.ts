import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "Keep it under 80 characters."),
  phone: z.string().trim().regex(/^$|^\+?[\d\s()-]{7,20}$/, "Use digits, spaces, + ( ) or -.").max(20),
});

/** The signed-in user edits their own name and phone (stored in their auth profile). */
export async function PATCH(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });
  if (!(await rateLimit(`profile:${user.id}`, 10, 900))) return NextResponse.json({ error: "Too many changes. Try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const sb = (await supabaseServer())!;
  const { error } = await sb.auth.updateUser({ data: { full_name: parsed.data.name, phone: parsed.data.phone || null } });
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
