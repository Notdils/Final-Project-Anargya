import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { fetchStatus, validSignature } from "@/lib/midtrans";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { flagAmountMismatch } from "@/lib/reconcile";
import { applyBookingStatus } from "@/lib/booking-pay";

// Midtrans HTTP notification. Set this URL in the Midtrans dashboard:
//   https://<domain>/api/midtrans/notify
export async function POST(req: Request) {
  if (!(await rateLimit(`notify:${await clientIp()}`, 120, 60))) return NextResponse.json({ ok: false }, { status: 429 });
  const n = await req.json().catch(() => null);
  if (typeof n?.order_id !== "string" || !/^[0-9a-f-]{36}$/i.test(n.order_id)) return NextResponse.json({ ok: true, ignored: true }); // not one of our orders (e.g. dashboard test ping)

  // The body is only a trigger. A scoped (generated) server key may not match the key Midtrans
  // signs with, so the signature is logged, not required. The authority is the status we fetch
  // from Midtrans ourselves, authenticated with our server key.
  if (!n.signature_key || !validSignature(n)) console.warn("midtrans notify: signature mismatch", n.order_id);

  const sb = supabaseService();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });
  // Look the id up first, so random ids never spend a Midtrans API call.
  const { data: order } = await sb.from("orders").select("id, charged_idr, status").eq("id", n.order_id).maybeSingle();
  if (!order) {
    // consultation bookings share the Midtrans account; their id is the booking id
    const { data: booking } = await sb.from("bookings").select("id, charged_idr, pay_expires_at").eq("id", n.order_id).eq("pay_status", "pending").maybeSingle();
    if (!booking) return NextResponse.json({ ok: true }); // unknown id: acknowledge, do nothing
    const bs = await fetchStatus(n.order_id);
    if (!bs) return NextResponse.json({ ok: false }, { status: 503 });
    await applyBookingStatus(booking, bs, false);
    return NextResponse.json({ ok: true });
  }
  const status = await fetchStatus(n.order_id);
  if (!status) return NextResponse.json({ ok: false }, { status: 503 });
  if (Number(status.gross_amount) !== Number(order.charged_idr)) {
    // Acknowledge (stops retries) but do not mark paid: a person checks it from the admin.
    await flagAmountMismatch(order.id, status.gross_amount, Number(order.charged_idr));
    return NextResponse.json({ ok: true, flagged: true });
  }

  const s = status.transaction_status;
  const paid = s === "settlement" || (s === "capture" && (status.fraud_status ?? "accept") === "accept");
  if (paid) {
    const { error } = await sb.rpc("mark_order_paid", { p_order: order.id, p_txn: status.transaction_id, p_method: status.payment_type });
    if (error) { console.error(`mark_order_paid failed for ${order.id}: ${error.message}`); return NextResponse.json({ ok: false }, { status: 500 }); } // Midtrans retries
  } else if (["deny", "cancel", "failure"].includes(s)) {
    await sb.rpc("mark_order_status", { p_order: order.id, p_status: "failed", p_txn: status.transaction_id });
  } else if (s === "expire") {
    await sb.rpc("mark_order_status", { p_order: order.id, p_status: "expired", p_txn: status.transaction_id });
  }
  return NextResponse.json({ ok: true });
}
