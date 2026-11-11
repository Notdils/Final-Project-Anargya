"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart";
import { useLp, useT } from "@/i18n/client";

/** Abandon this pending order and go back to checkout with the same parts. */
export function ChangePayment({ orderId }: { orderId: string }) {
  const t = useT();
  const L = useLp();
  const router = useRouter();
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.status) return router.refresh();
        return setErr(t(data.error ?? "Could not change the payment method."));
      }
      cart.merge(data.items);
      router.push(L("/checkout"));
    } catch {
      setErr(t("Network error. Try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={go} disabled={busy} className="btn btn-outline w-fit shrink-0">
        {t(busy ? "Closing payment…" : "Use another method")}
      </button>
      {err && <p role="alert" className="text-[13px] text-oxide">{err}</p>}
    </div>
  );
}
