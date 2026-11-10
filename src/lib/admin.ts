import "server-only";
import { reconcileStale } from "@/lib/reconcile";
import { supabaseServer } from "@/lib/supabase/server";
import type { Order, OrderStatus } from "@/lib/orders";

export const RANGES = [7, 30, 90] as const;
export const parseDays = (v?: string) => (RANGES.includes(Number(v) as 7) ? Number(v) : 30);
const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString();

export type ReceiptFilter = { q?: string; status?: OrderStatus | "all"; days: number; page: number };
export const PAGE_SIZE = 20;
const STATUSES: OrderStatus[] = ["pending", "paid", "failed", "expired"];
export const parseStatus = (v?: string): OrderStatus | "all" => (STATUSES.includes(v as OrderStatus) ? (v as OrderStatus) : "all");

export async function overview(days: number) {
  const sb = await supabaseServer();
  if (!sb) return null;
  await reconcileStale().catch(() => {});
  const from = since(days), to = new Date().toISOString();
  const [orders, funnel] = await Promise.all([
    sb.from("orders").select("id, receipt_no, buyer_name, total_jpy, status, created_at").gte("created_at", from).order("created_at", { ascending: false }),
    sb.rpc("funnel_counts", { p_from: from, p_to: to }),
  ]);
  const list = (orders.data ?? []) as Pick<Order, "id" | "receipt_no" | "buyer_name" | "total_jpy" | "status" | "created_at">[];
  const paid = list.filter((o) => o.status === "paid");
  const steps = ((funnel.data ?? []) as { step: string; sessions: number }[]).map((s) => ({ step: s.step, n: Number(s.sessions) }));
  const home = steps.find((s) => s.step === "home")?.n ?? 0;
  const paidN = steps.find((s) => s.step === "paid")?.n ?? paid.length;
  return {
    revenue: paid.reduce((s, o) => s + o.total_jpy, 0),
    paid: paid.length,
    pending: list.filter((o) => o.status === "pending").length,
    conversion: home ? (paidN / home) * 100 : null,
    funnel: steps,
    recent: list.slice(0, 5),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any; // Supabase's builder generics are too deep for a shared helper; inputs are validated above.
function applyFilters(q: Q, f: ReceiptFilter): Q {
  let x = q.gte("created_at", since(f.days));
  if (f.status && f.status !== "all") x = x.eq("status", f.status);
  const term = f.q?.trim().replace(/[%,()*]/g, "");
  if (term) x = x.or(`receipt_no.ilike.%${term}%,buyer_name.ilike.%${term}%,email.ilike.%${term}%`);
  return x;
}

export async function receipts(f: ReceiptFilter) {
  const sb = await supabaseServer();
  if (!sb) return null;
  const base = sb.from("orders").select("*", { count: "exact" });
  const { data, count } = await applyFilters(base, f)
    .order("created_at", { ascending: false })
    .range((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE - 1);
  return { rows: (data ?? []) as Order[], total: count ?? 0 };
}

export async function receiptsForExport(f: Omit<ReceiptFilter, "page">) {
  const sb = await supabaseServer();
  if (!sb) return [];
  const { data } = await applyFilters(sb.from("orders").select("*, order_items(code, name, qty, unit_price_jpy)"), { ...f, page: 1 })
    .order("created_at", { ascending: false })
    .limit(5000);
  return (data ?? []) as Order[];
}
