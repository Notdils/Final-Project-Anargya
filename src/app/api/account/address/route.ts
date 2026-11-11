import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

/** Forget the saved shipping address (checkout will ask again). */
export async function DELETE() {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });
  const sb = (await supabaseServer())!;
  const { error } = await sb.auth.updateUser({ data: { shipping_address: null } });
  if (error) return NextResponse.json({ error: "Could not remove it. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
