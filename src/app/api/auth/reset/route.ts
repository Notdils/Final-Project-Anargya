import { homeFor, isStaff, toRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const Body = z
  .object({ password: z.string().min(8, "At least 8 characters.").max(200), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "The reset link expired. Request a new one." }, { status: 401 });
  if (!(await rateLimit(`reset:${user.id}`, 5, 900))) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const sb = (await supabaseServer())!;
  const { error } = await sb.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const role = toRole((user.app_metadata as { role?: string }).role);
  return NextResponse.json({ redirect: role && isStaff(role) ? homeFor(role) : "/marketplace" });
}
