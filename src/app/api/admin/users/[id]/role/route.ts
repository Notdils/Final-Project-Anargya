import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { STAFF_ROLES, toRole } from "@/lib/rbac";

const Body = z.object({ role: z.enum([...STAFF_ROLES, "customer"]), confirmEmail: z.string().trim().toLowerCase() });

/** Change a user's role (admins only). The user must not be yourself; the email is typed to confirm. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("users.manage");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  if (id === g.user!.id) return NextResponse.json({ error: "You cannot change your own role." }, { status: 409 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a role." }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { data: target } = await sb.auth.admin.getUserById(id);
  const u = target?.user;
  if (!u) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if ((u.email ?? "").toLowerCase() !== parsed.data.confirmEmail) return NextResponse.json({ error: "The email does not match.", fields: { confirmEmail: ["Type the user's email exactly."] } }, { status: 400 });
  const before = toRole((u.app_metadata as { role?: string } | undefined)?.role);
  const next = parsed.data.role;
  const { error } = await sb.auth.admin.updateUserById(id, { app_metadata: { ...(u.app_metadata ?? {}), role: next === "customer" ? null : next } });
  if (error) return NextResponse.json({ error: "Could not change the role." }, { status: 500 });
  await audit(g.user!, "user.role", id, { email: u.email, from: before, to: next });
  return NextResponse.json({ ok: true, role: next });
}
