import "server-only";
import { createHash } from "node:crypto";
import { MIDTRANS_IS_PRODUCTION } from "@/lib/env";

const SNAP = MIDTRANS_IS_PRODUCTION ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";
const CORE = MIDTRANS_IS_PRODUCTION ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";

const serverKey = () => process.env.MIDTRANS_SERVER_KEY ?? "";
export const hasMidtrans = () => Boolean(serverKey() && process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);
const auth = () => "Basic " + Buffer.from(serverKey() + ":").toString("base64");

export async function createSnap(input: {
  orderId: string;
  grossIdr: number;
  customer: { name: string; email: string; phone: string };
  finishUrl: string;
}) {
  const res = await fetch(SNAP, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.grossIdr },
      customer_details: { first_name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
      credit_card: { secure: true },
      callbacks: { finish: input.finishUrl },
      expiry: { unit: "hours", duration: 24 },
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
  if (!res.ok) return null;
  return (await res.json()) as { transaction_status: string; fraud_status?: string; transaction_id: string; payment_type: string; gross_amount: string };
}
