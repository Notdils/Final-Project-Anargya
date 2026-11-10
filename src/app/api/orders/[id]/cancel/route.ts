import { NextResponse } from "next/server";
import { currentUser, supabaseService } from "@/lib/supabase/server";
import { getOrder } from "@/lib/orders";
import { expireTransaction, lookupStatus } from "@/lib/midtrans";
import { reconcileOrder } from "@/lib/reconcile";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Buyer abandons a pending order to pick another payment method.
 * Midtrans locks a Snap session to the first method chosen, so the only way to switch is a new order.
 * We close the old transaction at Midtrans first, so the old QR / VA cannot be paid afterwards.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!(await rateLimit(`cancel:${user.id}`, 10, 600))) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const order = await getOrder((await params).id); // RLS: owner (or admin) only
  if (!order || order.user_id !== user.id) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ error: "This order is no longer waiting for payment.", status: order.status }, { status: 409 });

  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const st = await lookupStatus(order.id);
  if (!st) return NextResponse.json({ error: "Could not reach Midtrans. Try again." }, { status: 503 });

  if (!st.missing) {
    const s = st.transaction_status;
    if (s === "settlement" || s === "capture") {
      // Paid in the meantime: record it instead of cancelling.
      await reconcileOrder(order.id);
      return NextResponse.json({ error: "This order was just paid.", status: "paid" }, { status: 409 });
    }
    if (s === "pending") {
      const r = await expireTransaction(order.id);
      if (!r.ok) return NextResponse.json({ error: `Midtrans did not close the payment (code ${r.code}).` }, { status: 502 });
    }
  }

  await sb.rpc("mark_order_status", { p_order: order.id, p_status: "expired", p_txn: st.missing ? null : (st.transaction_id ?? null) });
  return NextResponse.json({ items: (order.order_items ?? []).map((i) => ({ id: i.product_id, qty: i.qty })) });
}
