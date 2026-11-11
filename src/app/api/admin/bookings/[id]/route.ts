import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

const Body = z.object({ status: z.enum(["requested", "confirmed", "cancelled"]) });

/** Admin changes a booking status. RLS also requires admin for the update. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await currentUser();
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const ct = req.headers.get("content-type") ?? "";
  const raw = ct.includes("application/json") ? await req.json().catch(() => null) : Object.fromEntries(await req.formData());
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "bad status" }, { status: 400 });
  const sb = (await supabaseServer())!;
  const { error } = await sb.from("bookings").update({ status: parsed.data.status }).eq("id", id);
  if (error) {
    const msg = error.code === "23505" ? "Another booking already holds this slot." : "Could not update.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  // plain form posts come back to the list
  if (!ct.includes("application/json")) return NextResponse.redirect(new URL("/admin/bookings", req.url), 303);
  return NextResponse.json({ ok: true });
}
