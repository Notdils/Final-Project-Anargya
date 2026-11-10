import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type OrderStatus = "pending" | "paid" | "failed" | "expired";
export type OrderItem = { product_id: string; code: string; name: string; qty: number; unit_price_jpy: number };
export type Order = {
  id: string; receipt_no: string; user_id: string; email: string; buyer_name: string; phone: string;
  address: string; city: string; postal_code: string; country: string;
  subtotal_jpy: number; shipping_jpy: number; total_jpy: number; fx_rate: number; charged_idr: number;
  status: OrderStatus; oversold?: boolean; needs_review?: boolean; review_note?: string | null; snap_redirect_url?: string | null; pay_expires_at?: string | null; method: string | null; midtrans_txn_id: string | null; created_at: string; paid_at: string | null;
  order_items?: OrderItem[];
};

/** RLS limits this to the owner or an admin. */
export async function getOrder(id: string): Promise<Order | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.from("orders").select("*, order_items(product_id, code, name, qty, unit_price_jpy)").eq("id", id).maybeSingle();
  return (data as Order) ?? null;
}

export type SavedAddress = { buyer_name: string; phone: string; address: string; city: string; postal_code: string; country: string };

/** The buyer's most recent shipping details (RLS: own orders only). Used to prefill checkout. */
export async function lastAddress(): Promise<SavedAddress | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb
    .from("orders")
    .select("buyer_name, phone, address, city, postal_code, country")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SavedAddress) ?? null;
}
