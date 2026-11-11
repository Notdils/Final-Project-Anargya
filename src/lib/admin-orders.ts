import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { Order } from "@/lib/orders";

export const ORDER_TABS = [
  { id: "all", label: "All" },
  { id: "to_pack", label: "To pack" },
  { id: "shipped", label: "Shipped" },
  { id: "waiting", label: "Waiting payment" },
  { id: "review", label: "Needs review" },
  { id: "oversold", label: "Refund or restock" },
] as const;
export type OrderTab = (typeof ORDER_TABS)[number]["id"];
export const parseTab = (v?: string): OrderTab => (ORDER_TABS.some((t) => t.id === v) ? (v as OrderTab) : "all");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any;
function tabFilter(q: Q, tab: OrderTab): Q {
  if (tab === "to_pack") return q.eq("status", "paid").eq("fulfilment_status", "to_pack");
  if (tab === "shipped") return q.eq("status", "paid").in("fulfilment_status", ["shipped", "delivered"]);
  if (tab === "waiting") return q.eq("status", "pending");
  if (tab === "review") return q.eq("needs_review", true);
  if (tab === "oversold") return q.eq("oversold", true);
  return q;
}

/** Orders for the admin board (RLS: orders.read), with per-tab counts for the same period. */
export async function adminOrders(opts: { tab: OrderTab; q: string; days: number }) {
  const sb = await supabaseServer();
  if (!sb) return { rows: [] as Order[], counts: {} as Record<OrderTab, number> };
  const from = new Date(Date.now() - opts.days * 864e5).toISOString();
  const term = opts.q.trim().replace(/[%,()*]/g, "");
  const base = (sel: string, head = false) => {
    let q = sb.from("orders").select(sel, head ? { count: "exact", head: true } : undefined).gte("created_at", from);
    if (term) q = q.or(`receipt_no.ilike.%${term}%,buyer_name.ilike.%${term}%,email.ilike.%${term}%`);
    return q;
  };
  const [list, ...counts] = await Promise.all([
    tabFilter(base("*, order_items(product_id, code, name, qty, unit_price_jpy, unit_price_usd)"), opts.tab).order("created_at", { ascending: false }).limit(100),
    ...ORDER_TABS.map((t) => tabFilter(base("id", true), t.id)),
  ]);
  return {
    rows: (list.data ?? []) as Order[],
    counts: Object.fromEntries(ORDER_TABS.map((t, i) => [t.id, counts[i].count ?? 0])) as Record<OrderTab, number>,
  };
}
