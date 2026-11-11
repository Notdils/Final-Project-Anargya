import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { hasMidtrans, lookupStatus } from "@/lib/midtrans";

// Same grace as orders: a payment finished in the last second still lands.
const GRACE_MS = 10 * 60 * 1000;

type Row = { id: string; charged_idr: number | null; pay_expires_at: string | null };

/** Apply a Midtrans status to a booking. Only moves a booking that is still pending. */
export async function applyBookingStatus(
  b: Row,
  st: { transaction_status?: string; fraud_status?: string; transaction_id?: string; payment_type?: string; gross_amount?: string } | { missing: true },
  pastDeadline: boolean,
) {
  const sb = supabaseService();
  if (!sb) return;
  const upd = (v: Record<string, unknown>) => sb.from("bookings").update(v).eq("id", b.id).eq("pay_status", "pending");
  if ("missing" in st && st.missing) {
    if (pastDeadline) await upd({ pay_status: "expired", status: "cancelled" });
    return;
  }
  const s = (st as { transaction_status?: string }).transaction_status ?? "";
  const t = st as { transaction_id?: string; payment_type?: string; gross_amount?: string; fraud_status?: string };
  if (s === "expire") return void (await upd({ pay_status: "expired", status: "cancelled", midtrans_txn_id: t.transaction_id ?? null }));
  if (Number(t.gross_amount) !== Number(b.charged_idr)) {
    await sb.from("bookings").update({ needs_review: true, review_note: `Midtrans amount ${t.gross_amount ?? "unknown"} IDR, expected ${b.charged_idr} IDR` }).eq("id", b.id);
    return;
  }
  if (s === "settlement" || (s === "capture" && (t.fraud_status ?? "accept") === "accept")) {
    const { error } = await upd({ pay_status: "paid", status: "confirmed", paid_at: new Date().toISOString(), midtrans_txn_id: t.transaction_id ?? null, pay_method: t.payment_type ?? null });
    // e.g. the slot was given to someone else meanwhile: money arrived, so a person must sort it out
    if (error) await sb.from("bookings").update({ needs_review: true, review_note: `Paid via Midtrans (${t.transaction_id ?? "?"}) but could not confirm: ${error.message}` }).eq("id", b.id);
  }
  else if (["deny", "cancel", "failure"].includes(s))
    await upd({ pay_status: "failed", status: "cancelled", midtrans_txn_id: t.transaction_id ?? null });
}

async function sync(b: Row) {
  const pastDeadline = !!b.pay_expires_at && new Date(b.pay_expires_at).getTime() + GRACE_MS < Date.now();
  const st = await lookupStatus(b.id);
  if (!st) return;
  await applyBookingStatus(b, st, pastDeadline);
}

/** Sync one pending booking now (status page). */
export async function reconcileBooking(id: string) {
  const sb = supabaseService();
  if (!sb || !hasMidtrans()) return;
  const { data } = await sb.from("bookings").select("id, charged_idr, pay_expires_at").eq("id", id).eq("pay_status", "pending").eq("needs_review", false).maybeSingle();
  if (data) await sync(data);
}

/** Free slots held by abandoned payments. Called when the slot list is loaded. */
export async function reconcileStaleBookings() {
  const sb = supabaseService();
  if (!sb || !hasMidtrans()) return;
  const { data } = await sb
    .from("bookings")
    .select("id, charged_idr, pay_expires_at")
    .eq("pay_status", "pending")
    .eq("needs_review", false)
    .lt("pay_expires_at", new Date(Date.now() - GRACE_MS).toISOString())
    .limit(10);
  for (const b of data ?? []) await sync(b);
}
