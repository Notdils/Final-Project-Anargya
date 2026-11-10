import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SlimFooter } from "@/components/site-footer";
import { OrderStatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/print-button";
import { getOrder } from "@/lib/orders";
import { reconcileOrder } from "@/lib/reconcile";
import { jst, rupiah, yen } from "@/lib/format";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

const BANNER = {
  paid: { cls: "bg-teal-tint", icon: <CheckCircle2 size={20} className="text-teal" aria-hidden />, title: "Payment received", tcls: "text-teal" },
  pending: { cls: "bg-ochre-tint", icon: <Clock size={20} className="text-ochre" aria-hidden />, title: "Waiting for payment", tcls: "text-ink" },
  failed: { cls: "bg-oxide-tint", icon: <AlertCircle size={20} className="text-oxide" aria-hidden />, title: "Payment failed", tcls: "text-oxide" },
  expired: { cls: "bg-surface-2", icon: <AlertCircle size={20} className="text-muted" aria-hidden />, title: "Payment expired", tcls: "text-ink" },
} as const;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  let o = await getOrder(id);
  if (!o) notFound();
  if (o.status === "pending") {
    await reconcileOrder(o.id);
    o = (await getOrder(id)) ?? o;
  }
  const open = o.status === "pending" && Boolean(o.snap_redirect_url) && (!o.pay_expires_at || new Date(o.pay_expires_at).getTime() > Date.now());
  const b = BANNER[o.status];
  return (
    <>
      <div className="print:hidden"><SiteHeader /></div>
      <main id="main" className="pt-16 print:pt-0">
        <div className="container-x flex justify-center py-6 md:py-12">
          <div className="flex w-full max-w-[720px] flex-col gap-6">
            <div role="status" className={`flex gap-3 rounded-lg p-4 print:hidden ${b.cls}`}>
              {b.icon}
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={`font-semibold ${b.tcls}`}>{b.title}</p>
                  <p className="text-sm text-[#404040]">
                    {o.status === "paid"
                      ? `A copy of this receipt is available in your account (${o.email}).`
                      : o.status === "pending"
                        ? open
                          ? `Your order is held until ${jst(o.pay_expires_at!)}. If you already paid, refresh in a moment.`
                          : "We are confirming the payment with Midtrans. Refresh in a moment."
                        : "No money was taken. You can place the order again from the marketplace."}
                  </p>
                </div>
                {open && <a href={o.snap_redirect_url!} className="btn btn-ochre w-fit shrink-0">Continue payment</a>}
              </div>
            </div>

            {o.oversold && (
              <p role="alert" className="flex gap-3 rounded-lg bg-oxide-tint p-4 text-sm text-oxide print:hidden">
                <AlertCircle size={20} className="shrink-0" aria-hidden />
                Your payment went through, but the last unit of a part was sold moments earlier. Our team will contact you about a refund or a restock date.
              </p>
            )}
            <article aria-label={`Receipt ${o.receipt_no}`} className="flex flex-col gap-5 rounded-xl border border-line p-5 md:p-8 print:border-0 print:p-0">
              <header className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <p className="text-sm font-semibold tracking-[0.12em]">ANARGYA CORP.</p>
                  <p className="text-xs text-muted">[PLACEHOLDER] Company address, Japan</p>
                </div>
                <div className="flex flex-col gap-1 md:items-end">
                  <p className="eyebrow">Receipt</p>
                  <p className="font-mono font-medium">{o.receipt_no}</p>
                  <OrderStatusBadge status={o.status} />
                </div>
              </header>
              <hr className="border-line" />
              <dl className="grid gap-3 text-sm md:grid-cols-3 md:gap-6">
                <div><dt className="eyebrow text-muted">Issued</dt><dd>{jst(o.paid_at ?? o.created_at)}</dd></div>
                <div><dt className="eyebrow text-muted">Billed to</dt><dd className="[overflow-wrap:anywhere]">{o.buyer_name}<br />{o.email}</dd></div>
                <div><dt className="eyebrow text-muted">Payment</dt><dd>Midtrans{o.method ? ` · ${o.method}` : ""}<br /><span className="font-mono text-xs">{o.midtrans_txn_id ?? "awaiting"}</span></dd></div>
              </dl>
              <hr className="border-line" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="eyebrow text-left text-muted">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="hidden pb-2 font-medium md:table-cell">Code</th>
                    <th className="hidden pb-2 text-right font-medium md:table-cell">Qty</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {o.order_items?.map((i) => (
                    <tr key={i.product_id} className="border-t border-line">
                      <td className="py-2">{i.name}<span className="md:hidden"> × {i.qty}</span></td>
                      <td className="hidden py-2 font-mono text-[13px] md:table-cell">{i.code}</td>
                      <td className="hidden py-2 text-right font-mono md:table-cell">{i.qty}</td>
                      <td className="py-2 text-right font-mono">{yen(i.unit_price_jpy * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="border-line" />
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-mono">{yen(o.subtotal_jpy)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="font-mono">{yen(o.shipping_jpy)}</dd></div>
                <div className="flex justify-between"><dt className="font-semibold">Total (JPY)</dt><dd className="font-mono font-medium">{yen(o.total_jpy)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Charged (IDR)</dt><dd className="font-mono">{rupiah(o.charged_idr)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Rate</dt><dd className="font-mono">{o.fx_rate} IDR/JPY</dd></div>
              </dl>
            </article>

            <div className="flex flex-col gap-3 sm:flex-row print:hidden">
              <PrintButton />
              <Link href="/marketplace" className="btn btn-ochre btn-lg">Continue shopping</Link>
            </div>
          </div>
        </div>
      </main>
      <div className="print:hidden"><SlimFooter /></div>
    </>
  );
}
