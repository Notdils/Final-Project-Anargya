import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { fetchStatus, validSignature } from "@/lib/midtrans";

// Midtrans HTTP notification. Set this URL in the Midtrans dashboard:
//   https://<domain>/api/midtrans/notify
export async function POST(req: Request) {
  const n = await req.json().catch(() => null);
  if (!n?.order_id || !n?.signature_key || !validSignature(n)) return NextResponse.json({ ok: false }, { status: 401 });

  const status = await fetchStatus(n.order_id); // never trust the body alone
  const sb = supabaseService();
  if (!status || !sb) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: order } = await sb.from("orders").select("id, charged_idr, status").eq("id", n.order_id).maybeSingle();
  if (!order) return NextResponse.json({ ok: true }); // unknown order: acknowledge, do nothing
  if (Number(status.gross_amount) !== Number(order.charged_idr)) return NextResponse.json({ ok: false }, { status: 409 });

  const s = status.transaction_status;
  const paid = s === "settlement" || (s === "capture" && (status.fraud_status ?? "accept") === "accept");
  if (paid) {
    await sb.rpc("mark_order_paid", { p_order: order.id, p_txn: status.transaction_id, p_method: status.payment_type });
  } else if (["deny", "cancel", "failure"].includes(s)) {
    await sb.rpc("mark_order_status", { p_order: order.id, p_status: "failed", p_txn: status.transaction_id });
  } else if (s === "expire") {
    await sb.rpc("mark_order_status", { p_order: order.id, p_status: "expired", p_txn: status.transaction_id });
  }
  return NextResponse.json({ ok: true });
}
