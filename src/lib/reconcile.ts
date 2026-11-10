import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { hasMidtrans, lookupStatus } from "@/lib/midtrans";

// Grace after the deadline so a payment finished in the last second still lands via the webhook.
const GRACE_MS = 10 * 60 * 1000;

/**
 * Settle pending orders whose payment window has passed. Midtrans only sends an "expire"
 * notification if the buyer picked a method, so an abandoned Snap popup would stay pending forever.
 * We ask Midtrans first: a late payment is still recorded as paid.
 */
export async function reconcileStale() {
  const sb = supabaseService();
  if (!sb || !hasMidtrans()) return;
  const { data } = await sb
    .from("orders")
    .select("id, charged_idr, pay_expires_at")
    .eq("status", "pending")
    .lt("pay_expires_at", new Date(Date.now() - GRACE_MS).toISOString())
    .limit(20);
  for (const o of data ?? []) await sync(o);
}

/** Sync one pending order with Midtrans now (receipt view). Backup for a missed webhook. */
export async function reconcileOrder(id: string) {
  const sb = supabaseService();
  if (!sb || !hasMidtrans()) return;
  const { data } = await sb.from("orders").select("id, charged_idr, pay_expires_at").eq("id", id).eq("status", "pending").maybeSingle();
  if (data) await sync(data);
}

async function sync(o: { id: string; charged_idr: number; pay_expires_at: string | null }) {
  const sb = supabaseService()!;
  const pastDeadline = !!o.pay_expires_at && new Date(o.pay_expires_at).getTime() + GRACE_MS < Date.now();
  {
    const st = await lookupStatus(o.id);
    if (!st) return; // could not reach Midtrans: try again next time
    if (st.missing && !pastDeadline) return; // buyer has not picked a method yet, window still open
    if (st.missing || st.transaction_status === "expire") {
      await sb.rpc("mark_order_status", { p_order: o.id, p_status: "expired", p_txn: st.missing ? null : st.transaction_id });
      return;
    }
    const s = st.transaction_status;
    if (Number(st.gross_amount) !== Number(o.charged_idr)) return;
    if (s === "settlement" || (s === "capture" && (st.fraud_status ?? "accept") === "accept"))
      await sb.rpc("mark_order_paid", { p_order: o.id, p_txn: st.transaction_id, p_method: st.payment_type });
    else if (["deny", "cancel", "failure"].includes(s))
      await sb.rpc("mark_order_status", { p_order: o.id, p_status: "failed", p_txn: st.transaction_id });
  }
}
