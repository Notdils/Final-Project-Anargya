import "server-only";
import { createHash } from "node:crypto";
import { MIDTRANS_IS_PRODUCTION } from "@/lib/env";

const SNAP = MIDTRANS_IS_PRODUCTION ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";
const CORE = MIDTRANS_IS_PRODUCTION ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";

const serverKey = () => process.env.MIDTRANS_SERVER_KEY ?? "";
export const hasMidtrans = () => Boolean(serverKey() && process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);
const auth = () => "Basic " + Buffer.from(serverKey() + ":").toString("base64");

/** Minutes a buyer has to finish paying. Shown on the receipt; the order expires after this. */
export const PAY_WINDOW_MIN = 60;
/** Consultation slots are scarce: an unpaid booking holds its slot for this long only. */
export const BOOKING_PAY_WINDOW_MIN = 15;

export async function createSnap(input: {
  orderId: string;
  grossIdr: number;
  customer: { name: string; email: string; phone: string };
  finishUrl: string;
  expiryMin?: number;
}) {
  const res = await fetch(SNAP, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.grossIdr },
      customer_details: { first_name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
      credit_card: { secure: true },
      callbacks: { finish: input.finishUrl },
      expiry: { unit: "minutes", duration: input.expiryMin ?? PAY_WINDOW_MIN },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`midtrans ${res.status}`);
  return (await res.json()) as { token: string; redirect_url: string };
}

export function validSignature(n: { order_id: string; status_code: string; gross_amount: string; signature_key: string }) {
  const expected = createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + serverKey()).digest("hex");
  return expected === n.signature_key;
}

/** Second check: ask Midtrans directly instead of trusting the notification body. */
export async function fetchStatus(orderId: string) {
  const res = await fetch(`${CORE}/${encodeURIComponent(orderId)}/status`, { headers: { Authorization: auth(), Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) { console.error(`midtrans status HTTP ${res.status} for ${orderId}`); return null; } // 401/403: server key lacks Core API read
  return (await res.json()) as { transaction_status: string; fraud_status?: string; transaction_id: string; payment_type: string; gross_amount: string };
}

/**
 * Status lookup that tells "no transaction at Midtrans" (buyer closed Snap before choosing a method)
 * apart from a network or auth failure. Returns null only when we could not ask.
 */
export async function lookupStatus(orderId: string) {
  const res = await fetch(`${CORE}/${encodeURIComponent(orderId)}/status`, { headers: { Authorization: auth(), Accept: "application/json" }, cache: "no-store" }).catch(() => null);
  if (!res) { console.error(`midtrans status: network error for ${orderId}`); return null; }
  const body = (await res.json().catch(() => null)) as { status_code?: string; transaction_status?: string; fraud_status?: string; transaction_id?: string; payment_type?: string; gross_amount?: string } | null;
  if (!body) return null;
  if (res.status === 404 || body.status_code === "404") return { missing: true as const };
  if (!res.ok || !body.transaction_status) {
    // visible in Vercel → Logs; 401/403 usually means the server key has no "Core API: Read" access
    console.error(`midtrans status ${res.status}/${body.status_code ?? "-"} for ${orderId}: ${(body as { status_message?: string }).status_message ?? ""}`);
    return null;
  }
  return { missing: false as const, ...body, transaction_status: body.transaction_status };
}

/** Close an unpaid Midtrans transaction so its QR / VA can no longer be paid. */
export async function expireTransaction(orderId: string) {
  const res = await fetch(`${CORE}/${encodeURIComponent(orderId)}/expire`, { method: "POST", headers: { Authorization: auth(), Accept: "application/json" }, cache: "no-store" }).catch(() => null);
  if (!res) return { ok: false as const, code: "network" };
  const body = (await res.json().catch(() => null)) as { status_code?: string; transaction_status?: string } | null;
  // 407 = already expired; both mean the payment can no longer happen
  const ok = body?.transaction_status === "expire" || body?.status_code === "407" || body?.status_code === "200";
  return { ok, code: body?.status_code ?? String(res.status) };
}

/** Raw status answer for the admin "Check with Midtrans" button (no secrets: HTTP code and Midtrans fields only). */
export async function rawStatus(orderId: string) {
  const res = await fetch(`${CORE}/${encodeURIComponent(orderId)}/status`, { headers: { Authorization: auth(), Accept: "application/json" }, cache: "no-store" }).catch(() => null);
  if (!res) return { http: 0, error: "network error" };
  const b = (await res.json().catch(() => ({}))) as Record<string, string | undefined>;
  return {
    http: res.status, statusCode: b.status_code, statusMessage: b.status_message, transactionStatus: b.transaction_status,
    fraudStatus: b.fraud_status, paymentType: b.payment_type, grossAmount: b.gross_amount, transactionTime: b.transaction_time,
  };
}
