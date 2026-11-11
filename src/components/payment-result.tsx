"use client";
import { useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { useT } from "@/i18n/client";

/** Modal shown after Midtrans closes: animated check when paid, clock when the payment is still pending (e.g. bank transfer). */
export function PaymentResult({ state, onView, viewLabel = "View invoice" }: { state: "paid" | "pending" | null; onView: () => void; viewLabel?: string }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (state && !ref.current?.open) ref.current?.showModal();
  }, [state]);
  const paid = state === "paid";
  return (
    <dialog ref={ref} aria-labelledby="pay-title" onCancel={(e) => { e.preventDefault(); onView(); }} className="m-auto w-[min(400px,calc(100vw-40px))] rounded-xl p-8 text-center backdrop:bg-black/60">
      {state && (
        <div className="flex flex-col items-center gap-4">
          {paid ? (
            <svg viewBox="0 0 64 64" width={72} height={72} aria-hidden className="pay-check">
              <circle cx="32" cy="32" r="29" fill="none" stroke="#15803D" strokeWidth="4" />
              <path d="M19 33 l9 9 l17 -19" fill="none" stroke="#15803D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="grid size-[72px] place-items-center rounded-full bg-ochre-tint"><Clock size={36} className="text-ink" aria-hidden /></span>
          )}
          <h2 id="pay-title" className="text-xl font-semibold">{t(paid ? "Payment received" : "Waiting for your payment")}</h2>
          <p className="text-sm text-muted">{t(paid ? "Thank you. Your invoice is ready and we will email you when the order ships." : "Finish the payment with the instructions from Midtrans. Your order is saved and updates when the payment arrives.")}</p>
          <button type="button" className="btn btn-teal btn-lg mt-2 w-full" autoFocus onClick={onView}>{t(viewLabel)}</button>
        </div>
      )}
    </dialog>
  );
}
