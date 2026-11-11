import "server-only";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

export type OrderStatus = "pending" | "paid" | "failed" | "expired";
export type OrderItem = { product_id: string; code: string; name: string; qty: number; unit_price_jpy: number | null; unit_price_usd: number | string | null };
export type Fulfilment = "to_pack" | "shipped" | "delivered";

export type Order = {
  id: string; receipt_no: string; user_id: string; email: string; buyer_name: string; phone: string;
  address: string; city: string; postal_code: string; country: string;
  subtotal_jpy: number | null; shipping_jpy: number | null; total_jpy: number | null; fx_rate: number | null; charged_idr: number;
  subtotal_usd: number | string | null; shipping_usd: number | string | null; total_usd: number | string | null; fx_usd_idr: number | string | null;
  discount_usd?: number | string | null; voucher_code?: string | null;
  status: OrderStatus; oversold?: boolean; needs_review?: boolean; review_note?: string | null; snap_redirect_url?: string | null; pay_expires_at?: string | null; method: string | null; midtrans_txn_id: string | null; created_at: string; paid_at: string | null;
  ship_country?: string | null; ship_region?: string | null; shipping_zone?: string | null; address_note?: string | null;
  fulfilment_status?: Fulfilment; carrier?: string | null; tracking_no?: string | null; shipped_at?: string | null; delivered_at?: string | null;
  order_items?: OrderItem[];
};

/** RLS limits this to the owner or an admin. */
export async function getOrder(id: string): Promise<Order | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.from("orders").select("*, order_items(product_id, code, name, qty, unit_price_jpy, unit_price_usd)").eq("id", id).maybeSingle();
  return (data as Order) ?? null;
}

export type SavedAddress = { buyer_name: string; phone: string; address: string; city: string; postal_code: string; country: string; ship_country?: string | null; ship_region?: string | null; address_note?: string | null };

/**
 * The shipping address the buyer chose to save ("Save this as your shipping address" at checkout).
 * Stored in their own auth profile (user_metadata.shipping_address); nothing is taken from past orders.
 */
export async function savedAddress(): Promise<SavedAddress | null> {
  const { user } = await currentUser();
  const a = (user?.user_metadata as { shipping_address?: Partial<SavedAddress> } | undefined)?.shipping_address;
  if (!a || typeof a.address !== "string" || typeof a.buyer_name !== "string") return null;
  return {
    buyer_name: a.buyer_name, phone: String(a.phone ?? ""), address: a.address, city: String(a.city ?? ""), postal_code: String(a.postal_code ?? ""),
    country: String(a.country ?? ""), ship_country: a.ship_country ?? null, ship_region: a.ship_region ?? null, address_note: a.address_note ?? null,
  };
}
