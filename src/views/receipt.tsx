import Link from "next/link";
import { CONTACT } from "@/lib/contact";
import { notFound } from "next/navigation";
import { AlertCircle, Box, CheckCircle2, Clock, Truck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SlimFooter } from "@/components/site-footer";
import { OrderStatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/print-button";
import { ChangePayment } from "@/components/change-payment";
import { getOrder } from "@/lib/orders";
import { reconcileOrder } from "@/lib/reconcile";
import { AutoRefresh } from "@/components/auto-refresh";
import { jst, rupiah, yen } from "@/lib/format";
import { usd } from "@/lib/money";
import { destinationLabel } from "@/lib/shipping";
import { lp, translator, type Locale } from "@/i18n";


const BANNER = {
  paid: { cls: "bg-teal-tint", icon: <CheckCircle2 size={20} className="text-teal" aria-hidden />, title: "Payment received", tcls: "text-teal" },
  pending: { cls: "bg-ochre-tint", icon: <Clock size={20} className="text-ochre" aria-hidden />, title: "Waiting for payment", tcls: "text-ink" },
  failed: { cls: "bg-oxide-tint", icon: <AlertCircle size={20} className="text-oxide" aria-hidden />, title: "Payment failed", tcls: "text-oxide" },
  expired: { cls: "bg-surface-2", icon: <AlertCircle size={20} className="text-muted" aria-hidden />, title: "Payment expired", tcls: "text-ink" },
} as const;

export default async function ReceiptView({ id, locale, justPaid = false }: { id: string; locale: Locale; justPaid?: boolean }) {
  const t = translator(locale);
  const L = (p: string) => lp(p, locale);
  let o = await getOrder(id);
  if (!o) notFound();
  if (o.status === "pending") {
    await reconcileOrder(o.id);
    o = (await getOrder(id)) ?? o;
  }
  // Snap already reported success: don't offer "Continue payment" while Midtrans' notification is on its way.
  const confirming = o.status === "pending" && justPaid;
  const open = !confirming && o.status === "pending" && Boolean(o.snap_redirect_url) && (!o.pay_expires_at || new Date(o.pay_expires_at).getTime() > Date.now());
  const b = confirming ? { ...BANNER.pending, title: "Confirming your payment" } : BANNER[o.status];
  return (
    <>
      <div className="print:hidden"><SiteHeader /></div>
      {o.status === "pending" && !o.needs_review && <AutoRefresh />}
      <main id="main" className="pt-16 print:pt-0">
        <div className="container-x flex justify-center py-6 md:py-12">
          <div className="flex w-full max-w-[720px] flex-col gap-6">
            <div role="status" className={`flex gap-3 rounded-lg p-4 print:hidden ${b.cls}`}>
              {b.icon}
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={`font-semibold ${b.tcls}`}>{t(b.title)}</p>
                  <p className="text-sm text-[#404040]">
                    {o.status === "paid"
                      ? t("A copy of this receipt is available in your account ({email}).", { email: o.email })
                      : o.status === "pending"
                        ? open
                          ? t("Your order is held until {time}. If you already paid, this page updates by itself in a few seconds.", { time: jst(o.pay_expires_at!) })
                          : t("We are confirming your payment, please wait a moment.")
                        : t("No money was taken. Your parts are still available in the marketplace.")}
                  </p>
                </div>
                {open && (
                  <div className="flex flex-wrap items-start gap-2">
                    <a href={o.snap_redirect_url!} className="btn btn-pay w-fit shrink-0">{t("Continue payment")}</a>
                    <ChangePayment orderId={o.id} />
                  </div>
                )}
              </div>
            </div>

            {o.oversold && (
              <p role="alert" className="flex gap-3 rounded-lg bg-oxide-tint p-4 text-sm text-oxide print:hidden">
                <AlertCircle size={20} className="shrink-0" aria-hidden />
                {t("Your payment went through, but the last unit of a part was sold moments earlier. Our team will contact you about a refund or a restock date.")}
              </p>
            )}
            {o.status === "paid" && (
              <div className="flex items-start gap-3 rounded-lg border border-line p-4">
                {o.fulfilment_status === "to_pack" || !o.fulfilment_status ? <Box size={20} className="shrink-0 text-teal" aria-hidden /> : o.fulfilment_status === "shipped" ? <Truck size={20} className="shrink-0 text-teal" aria-hidden /> : <CheckCircle2 size={20} className="shrink-0 text-teal" aria-hidden />}
                <div className="flex flex-col gap-0.5 text-sm">
                  <p className="font-semibold">{t(o.fulfilment_status === "shipped" ? "Shipped" : o.fulfilment_status === "delivered" ? "Delivered" : "Being packed")}</p>
                  {o.fulfilment_status && o.fulfilment_status !== "to_pack" ? (
                    <p className="text-[#404040]">{o.carrier} · <span className="font-mono">{o.tracking_no}</span>{o.shipped_at ? ` · ${jst(o.shipped_at)}` : ""}</p>
                  ) : (
                    <p className="text-[#404040]">{t("We will add the tracking number here when your parts ship.")}</p>
                  )}
                </div>
              </div>
            )}
            <article aria-label={t("Receipt {no}", { no: o.receipt_no })} className="flex flex-col gap-5 rounded-xl border border-line p-5 md:p-8 print:border-0 print:p-0">
              <header className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <p className="text-sm font-semibold tracking-[0.12em]">ANARGYA CORP.</p>
                  <p className="text-xs text-muted">{t(CONTACT.address)} · {CONTACT.email}</p>
                </div>
                <div className="flex flex-col gap-1 md:items-end">
                  <p className="eyebrow">{t("Receipt")}</p>
                  <p className="font-mono font-medium">{o.receipt_no}</p>
                  <OrderStatusBadge status={o.status} />
                </div>
              </header>
              <hr className="border-line" />
              <dl className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-4 md:gap-6">
                <div><dt className="eyebrow text-muted">{t("Issued")}</dt><dd>{jst(o.paid_at ?? o.created_at)}</dd></div>
                <div><dt className="eyebrow text-muted">{t("Billed to")}</dt><dd className="[overflow-wrap:anywhere]">{o.buyer_name}<br />{o.email}</dd></div>
                <div><dt className="eyebrow text-muted">{t("Ship to")}</dt><dd>{o.city}<br />{destinationLabel(o.country, o.ship_region, locale, o.ship_country)}</dd></div>
                <div><dt className="eyebrow text-muted">{t("Payment")}</dt><dd>Midtrans{o.method ? ` · ${o.method}` : ""}<br /><span className="font-mono text-xs">{o.midtrans_txn_id ?? t("awaiting")}</span></dd></div>
              </dl>
              <hr className="border-line" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="eyebrow text-left text-muted">
                    <th className="pb-2 font-medium">{t("Item")}</th>
                    <th className="hidden pb-2 font-medium md:table-cell">{t("Code")}</th>
                    <th className="hidden pb-2 text-right font-medium md:table-cell">{t("Qty")}</th>
                    <th className="pb-2 text-right font-medium">{t("Amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {o.order_items?.map((i) => (
                    <tr key={i.product_id} className="border-t border-line">
                      <td className="py-2">{i.name}<span className="md:hidden"> × {i.qty}</span></td>
                      <td className="hidden py-2 font-mono text-[13px] md:table-cell">{i.code}</td>
                      <td className="hidden py-2 text-right font-mono md:table-cell">{i.qty}</td>
                      <td className="py-2 text-right font-mono">{i.unit_price_usd != null ? usd(Number(i.unit_price_usd) * i.qty) : yen((i.unit_price_jpy ?? 0) * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="border-line" />
              <dl className="flex flex-col gap-2 text-sm">
                {o.total_usd != null ? (
                  <>
                    <div className="flex justify-between"><dt className="text-muted">{t("Subtotal")}</dt><dd className="font-mono">{usd(Number(o.subtotal_usd))}</dd></div>
                    {Number(o.discount_usd) > 0 && <div className="flex justify-between"><dt className="text-muted">{t("Voucher")} <span className="font-mono">{o.voucher_code}</span></dt><dd className="font-mono">−{usd(Number(o.discount_usd))}</dd></div>}
                    <div className="flex justify-between"><dt className="text-muted">{t("Shipping")}</dt><dd className="font-mono">{Number(o.shipping_usd) ? usd(Number(o.shipping_usd)) : o.ship_country === "JP" ? <span className="font-sans">{t("Paid by you on delivery")}</span> : t("Included")}</dd></div>
                    <div className="flex justify-between"><dt className="font-semibold">{t("Total (USD)")}</dt><dd className="font-mono font-medium">{usd(Number(o.total_usd))}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">{t("Charged (IDR)")}</dt><dd className="font-mono">{rupiah(o.charged_idr)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">{t("Rate")}</dt><dd className="font-mono">{Number(o.fx_usd_idr).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")} IDR/USD</dd></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between"><dt className="text-muted">{t("Subtotal")}</dt><dd className="font-mono">{yen(o.subtotal_jpy ?? 0)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">{t("Shipping")}</dt><dd className="font-mono">{yen(o.shipping_jpy ?? 0)}</dd></div>
                    <div className="flex justify-between"><dt className="font-semibold">{t("Total (JPY)")}</dt><dd className="font-mono font-medium">{yen(o.total_jpy ?? 0)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">{t("Charged (IDR)")}</dt><dd className="font-mono">{rupiah(o.charged_idr)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">{t("Rate")}</dt><dd className="font-mono">{o.fx_rate} IDR/JPY</dd></div>
                  </>
                )}
              </dl>
            </article>

            <div className="flex flex-col gap-3 sm:flex-row print:hidden">
              <PrintButton filename={`Invoice ${o.receipt_no}`} />
              <Link href={L("/marketplace")} className="btn btn-teal btn-lg">{t("Continue shopping")}</Link>
            </div>
          </div>
        </div>
      </main>
      <div className="print:hidden"><SlimFooter /></div>
    </>
  );
}
