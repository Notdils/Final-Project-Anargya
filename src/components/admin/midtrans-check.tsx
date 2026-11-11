"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

type Res = { midtrans?: Record<string, string | number | undefined>; order?: { status: string; charged_idr: number; needs_review: boolean; review_note: string | null } | null; error?: string };

/** Admin drawer: check a pending order with Midtrans now and show the raw answer. */
export function MidtransCheck({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  async function run() {
    setBusy(true);
    const r = await fetch(`/api/admin/orders/${orderId}/midtrans`, { method: "POST" }).catch(() => null);
    setRes(((await r?.json().catch(() => null)) as Res) ?? { error: "Network error." });
    setBusy(false);
    router.refresh();
  }
  const m = res?.midtrans;
  const hint = !m ? null
    : m.http === 401 || m.http === 403 ? "The server key is rejected for status checks. Create a server key with Core API: Read and set MIDTRANS_SERVER_KEY in Vercel."
    : m.statusCode === "404" ? "Midtrans has no transaction for this order: the buyer has not chosen a payment method yet."
    : m.transactionStatus === "pending" ? "Midtrans still says pending: the buyer has not finished paying (e.g. VA or QRIS not paid / not simulated)."
    : res?.order?.needs_review ? "Midtrans charged a different amount than we expected. Check it in the Midtrans dashboard."
    : res?.order?.status === "paid" ? "Recorded as paid." : null;
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface p-4 text-sm">
      <button type="button" className="btn btn-outline w-fit" disabled={busy} onClick={run}><RefreshCw size={14} aria-hidden className={busy ? "animate-spin" : ""} />{busy ? "Checking…" : "Check with Midtrans"}</button>
      {res?.error && <p className="text-oxide">{res.error}</p>}
      {m && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-muted">HTTP</dt><dd>{m.http} {m.statusCode ? `(${m.statusCode})` : ""}</dd>
          <dt className="text-muted">Midtrans status</dt><dd>{m.transactionStatus ?? "–"} {m.fraudStatus ? `/ ${m.fraudStatus}` : ""}</dd>
          <dt className="text-muted">Method</dt><dd>{m.paymentType ?? "–"}</dd>
          <dt className="text-muted">Amount</dt><dd>{m.grossAmount ?? "–"} (ours {res?.order?.charged_idr ?? "–"})</dd>
          {m.statusMessage && <><dt className="text-muted">Message</dt><dd className="font-sans">{m.statusMessage}</dd></>}
          <dt className="text-muted">Our status now</dt><dd>{res?.order?.status ?? "–"}</dd>
        </dl>
      )}
      {hint && <p className="text-[13px]">{hint}</p>}
    </div>
  );
}
