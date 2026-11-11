import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { Order, OrderStatus } from "@/lib/orders";

export const RANGES = [7, 30, 90] as const;
export const parseDays = (v?: string) => (RANGES.includes(Number(v) as 7) ? Number(v) : 30);
const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString();

export type ReceiptFilter = { q?: string; status?: OrderStatus | "all" | "review"; days: number; page: number };
export const PAGE_SIZE = 20;
const STATUSES: OrderStatus[] = ["pending", "paid", "failed", "expired"];
export const parseStatus = (v?: string): OrderStatus | "all" | "review" => (v === "review" ? "review" : STATUSES.includes(v as OrderStatus) ? (v as OrderStatus) : "all");


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any; // Supabase's builder generics are too deep for a shared helper; inputs are validated above.
function applyFilters(q: Q, f: ReceiptFilter): Q {
  let x = q.gte("created_at", since(f.days));
  if (f.status === "review") x = x.eq("needs_review", true);
  else if (f.status && f.status !== "all") x = x.eq("status", f.status);
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
  const { data } = await applyFilters(sb.from("orders").select("*, order_items(code, name, qty, unit_price_jpy, unit_price_usd)"), { ...f, page: 1 })
    .order("created_at", { ascending: false })
    .limit(5000);
  return (data ?? []) as Order[];
}
