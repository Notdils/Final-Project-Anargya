import { NextResponse } from "next/server";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { hasMidtrans, rawStatus } from "@/lib/midtrans";
import { reconcileOrder } from "@/lib/reconcile";

/**
 * Admin: ask Midtrans about one order right now, apply the result (same rules as the webhook),
 * and show what Midtrans answered. For debugging an order stuck on pending.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("orders.read");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  if (!hasMidtrans()) return NextResponse.json({ error: "Midtrans keys are not set on the server." }, { status: 503 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const midtrans = await rawStatus(id);
  const before = await sb.from("orders").select("id, status, charged_idr, needs_review, pay_expires_at").eq("id", id).maybeSingle();
  const sync = await reconcileOrder(id);
  const { data, error } = await sb.from("orders").select("status, charged_idr, needs_review, review_note").eq("id", id).maybeSingle();
  // db: what the server (service key) can see, so a key or permission problem shows up here
  return NextResponse.json({ midtrans, order: data, db: { found: Boolean(before.data), readError: before.error?.message ?? error?.message ?? null, sync } });
}
