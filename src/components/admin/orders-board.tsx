"use client";
import Link from "next/link";
import { MidtransCheck } from "@/components/admin/midtrans-check";
import { destinationLabel } from "@/lib/shipping";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Box, Check, ChevronRight, Clock, Copy, ExternalLink, Search, Truck, X } from "lucide-react";
import type { Fulfilment, Order } from "@/lib/orders";
import { orderAmount, usd } from "@/lib/money";
import { OrderStatusBadge } from "@/components/status-badge";

type Tab = { id: string; label: string };
const FUL: Record<Fulfilment, { label: string; cls: string; Icon: typeof Box }> = {
  to_pack: { label: "To pack", cls: "bg-surface-2 text-[#404040]", Icon: Box },
  shipped: { label: "Shipped", cls: "bg-teal-tint text-teal", Icon: Truck },
  delivered: { label: "Delivered", cls: "bg-teal-tint text-teal", Icon: Check },
};
const when = (s?: string | null) =>
  s ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(s)) : "–";

function FulBadge({ o }: { o: Order }) {
  if (o.status !== "paid") return <span className="text-muted">–</span>;
  const f = FUL[o.fulfilment_status ?? "to_pack"];
  return <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${f.cls}`}><f.Icon size={12} aria-hidden />{f.label}</span>;
}

function PayBadge({ o }: { o: Order }) {
  if (o.needs_review) return <span className="inline-flex items-center gap-1 rounded bg-oxide-tint px-1.5 py-0.5 text-xs font-medium text-oxide"><AlertTriangle size={12} aria-hidden />Needs review</span>;
  return <OrderStatusBadge status={o.status} />;
}

const summary = (o: Order) => {
  const it = o.order_items ?? [];
  return it.length ? `${it[0].name} × ${it[0].qty}${it.length > 1 ? ` + ${it.length - 1} more` : ""}` : "";
};

export function OrdersBoard({ rows, counts, tabs, tab, q, days, canFulfil }: { rows: Order[]; counts: Record<string, number>; tabs: readonly Tab[]; tab: string; q: string; days: number; canFulfil: boolean }) {
  const [open, setOpen] = useState<Order | null>(null);
  const qs = (t: string) => `/admin/orders?${new URLSearchParams({ tab: t, days: String(days), ...(q ? { q } : {}) })}`;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Orders</h1>
        <p className="text-sm text-muted">Payment comes from Midtrans. Packing and shipping are set here.</p>
      </div>
      <nav aria-label="Order status" className="-mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:w-fit md:rounded-lg md:bg-surface-2 md:p-1">
        {tabs.map((t) => (
          <Link key={t.id} href={qs(t.id)} aria-current={tab === t.id ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${tab === t.id ? "bg-white text-ink shadow-sm md:shadow-none" : "text-muted"}`}>
            {t.label}<span className={`font-mono text-xs ${t.id === "review" && counts[t.id] ? "text-oxide" : "text-muted"}`}>{counts[t.id] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <form className="flex flex-col gap-2 md:flex-row" action="/admin/orders">
        <input type="hidden" name="tab" value={tab} />
        <label className="relative flex-1">
          <span className="sr-only">Search orders</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={q} className="input pl-9" placeholder="Search receipt no, buyer, email" />
        </label>
        <label><span className="sr-only">Period</span>
          <select name="days" defaultValue={days} className="input w-auto pr-8" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
            {[7, 30, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </label>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">No orders here.</div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface"><tr className="eyebrow text-left text-muted">
                <th className="px-4 py-3 font-medium">Order</th><th className="px-2 py-3 font-medium">Customer</th><th className="hidden px-2 py-3 font-medium xl:table-cell">Items</th>
                <th className="px-2 py-3 text-right font-medium">Total</th><th className="px-2 py-3 font-medium">Payment</th><th className="px-2 py-3 font-medium">Fulfilment</th><th className="w-10" />
              </tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="cursor-pointer border-t border-line hover:bg-surface" onClick={() => setOpen(o)}>
                    <td className="px-4 py-3"><button type="button" className="flex flex-col text-left" onClick={(e) => { e.stopPropagation(); setOpen(o); }}><span className="font-mono text-[13px] font-medium">{o.receipt_no}</span><span className="text-xs text-muted">{when(o.created_at)}</span></button></td>
                    <td className="px-2 py-3"><span className="flex flex-col"><span>{o.buyer_name}</span><span className="text-xs text-muted">{o.email}</span></span></td>
                    <td className="hidden px-2 py-3 text-[13px] text-[#404040] xl:table-cell">{summary(o)}</td>
                    <td className="px-2 py-3 text-right font-mono">{orderAmount(o)}</td>
                    <td className="px-2 py-3"><PayBadge o={o} /></td>
                    <td className="px-2 py-3"><FulBadge o={o} /></td>
                    <td className="pr-3"><ChevronRight size={16} className="text-muted" aria-hidden /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((o) => (
              <li key={o.id}><button type="button" onClick={() => setOpen(o)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-line p-4 text-left">
                <span className="flex min-w-0 flex-col gap-0.5"><span className="font-mono text-sm">{o.receipt_no}</span><span className="truncate text-sm">{o.buyer_name}</span><span className="text-xs text-muted">{when(o.created_at)} · {orderAmount(o)}</span></span>
                <span className="flex flex-col items-end gap-1"><PayBadge o={o} /><FulBadge o={o} /></span>
              </button></li>
            ))}
          </ul>
        </>
      )}
      {open && <OrderSheet o={open} canFulfil={canFulfil} onClose={() => setOpen(null)} />}
    </div>
  );
}

function OrderSheet({ o, canFulfil, onClose }: { o: Order; canFulfil: boolean; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<Fulfilment>(o.fulfilment_status ?? "to_pack");
  const [carrier, setCarrier] = useState(o.carrier ?? "");
  const [tracking, setTracking] = useState(o.tracking_no ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(o);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  async function save(next: Fulfilment) {
    setBusy(true); setErr("");
    const res = await fetch(`/api/admin/orders/${o.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ fulfilment_status: next, carrier, tracking_no: tracking }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setErr(data?.error ?? "Network error. Try again.");
    setStatus(next); setSaved({ ...saved, ...data });
    router.refresh();
  }

  const address = `${o.buyer_name}\n${o.address}\n${o.city} ${o.postal_code}\n${destinationLabel(o.country, o.ship_region)}\n${o.phone}${o.address_note ? `\nNote: ${o.address_note}` : ""}`;
  const paid = o.status === "paid";
  const nextStep: Fulfilment | null = status === "to_pack" ? "shipped" : status === "shipped" ? "delivered" : null;
  const h = "eyebrow text-teal";
  const row = (k: string, v: React.ReactNode, bold = false) => (
    <div className="flex justify-between gap-4 text-sm"><dt className={bold ? "font-semibold" : "text-muted"}>{k}</dt><dd className={`text-right font-mono ${bold ? "font-medium" : ""}`}>{v}</dd></div>
  );
  return (
    <div className="fixed inset-0 z-[1200] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="order-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col bg-white md:w-[520px]">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex flex-col gap-1">
            <h2 id="order-title" className="font-mono text-base font-medium">{o.receipt_no}</h2>
            <span className="flex items-center gap-2"><PayBadge o={o} /><span className="text-xs text-muted">{when(o.created_at)} JST</span></span>
          </div>
          <button type="button" className="btn btn-outline px-2" aria-label="Close" onClick={onClose}><X size={16} aria-hidden /></button>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          {o.needs_review && <p role="alert" className="flex gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />{o.review_note ?? "Midtrans reported a different amount. Check the Midtrans dashboard."}</p>}
          {o.oversold && <p role="alert" className="flex gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />Paid after the last unit was sold. Contact the buyer about a refund or a restock date.</p>}

          <section className="flex flex-col gap-3">
            <h3 className={h}>Fulfilment</h3>
            {!paid ? (
              <>
                <p className="flex items-center gap-2 rounded-lg bg-surface p-4 text-sm text-muted"><Clock size={16} aria-hidden />Packing starts once the order is paid.</p>
                {o.status === "pending" && <MidtransCheck orderId={o.id} />}
              </>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
                <ol className="flex items-center gap-1.5" aria-label="Fulfilment progress">
                  {(["to_pack", "shipped", "delivered"] as const).map((s, i) => {
                    const on = ["to_pack", "shipped", "delivered"].indexOf(status) >= i;
                    return (
                      <li key={s} className="flex items-center gap-1.5" aria-current={status === s ? "step" : undefined}>
                        {i > 0 && <span aria-hidden className={`h-px w-6 ${on ? "bg-teal" : "bg-line"}`} />}
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status === s ? "border-teal bg-teal text-white" : on ? "border-teal text-teal" : "border-line bg-white text-muted"}`}>{FUL[s].label}</span>
                      </li>
                    );
                  })}
                </ol>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5"><span className="text-[13px] font-medium">Carrier</span><input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} maxLength={60} placeholder="[PLACEHOLDER] carrier" disabled={!canFulfil} /></label>
                  <label className="flex flex-col gap-1.5"><span className="text-[13px] font-medium">Tracking number</span><input className="input font-mono" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={60} placeholder="e.g. 1234-5678-9012" disabled={!canFulfil} /></label>
                </div>
                {canFulfil && (
                  <div className="flex flex-wrap gap-2">
                    {nextStep && <button type="button" className="btn btn-teal" disabled={busy || !carrier.trim() || !tracking.trim()} onClick={() => save(nextStep)}>{busy ? "Saving…" : nextStep === "shipped" ? "Mark as shipped" : "Mark as delivered"}</button>}
                    {status !== "to_pack" && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => save(status)}>Save tracking</button>}
                    {status !== "to_pack" && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => save("to_pack")}>Back to To pack</button>}
                  </div>
                )}
                <p className="text-xs text-muted">The buyer sees the status and tracking number on their receipt.</p>
                {err && <p role="alert" className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{err}</p>}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className={h}>Items</h3>
            <ul className="flex flex-col gap-2">
              {(o.order_items ?? []).map((i) => (
                <li key={i.product_id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex flex-col"><span className="font-medium">{i.name}</span><span className="font-mono text-xs text-muted">{i.code} · × {i.qty}</span></span>
                  <span className="font-mono">{i.unit_price_usd != null ? usd(Number(i.unit_price_usd) * i.qty) : "–"}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1.5 border-t border-line pt-3">
              {o.total_usd != null && <>{row("Subtotal", usd(Number(o.subtotal_usd)))}{row("Shipping cost", Number(o.shipping_usd) ? usd(Number(o.shipping_usd)) : "Included")}{row("Total (USD)", usd(Number(o.total_usd)), true)}</>}
              {row("Charged (IDR)", `Rp ${Number(o.charged_idr).toLocaleString("id-ID")}`)}
              {o.fx_usd_idr != null && row("Rate", `${Number(o.fx_usd_idr).toLocaleString("id-ID")} IDR/USD`)}
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className={h}>Customer and address</h3>
            <address className="whitespace-pre-line text-sm not-italic leading-6 text-[#404040]">{o.email}{"\n"}{address.replace(/\nNote: [\s\S]*$/, "")}</address>
            {o.address_note && (
              <div className="rounded-lg bg-surface p-3 text-sm leading-6">
                <p className="eyebrow text-muted">Address details</p>
                {/* links shown as text unless https; opened without referrer */}
                <p className="whitespace-pre-line [overflow-wrap:anywhere]">{o.address_note.split(/(https:\/\/[^\s]+)/g).map((part, i) =>
                  /^https:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-teal underline">{part}</a> : part)}</p>
              </div>
            )}
            <button type="button" className="btn btn-outline w-fit px-3 min-h-8 py-1.5 text-[13px]" onClick={() => navigator.clipboard?.writeText(address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
              <Copy size={14} aria-hidden />{copied ? "Copied" : "Copy address"}
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className={h}>Payment</h3>
            <dl className="flex flex-col gap-1.5">{row("Gateway", `Midtrans${o.method ? ` · ${o.method}` : ""}`)}{row("Transaction", o.midtrans_txn_id ?? "–")}</dl>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className={h}>Timeline</h3>
            <ol className="flex flex-col gap-2 text-sm">
              {[["Order created", o.created_at], ["Paid via Midtrans", o.paid_at], ["Shipped", saved.shipped_at], ["Delivered", saved.delivered_at]].map(([l, t]) => (
                <li key={l} className="flex items-center gap-2.5"><span aria-hidden className={`h-2 w-2 rounded-full ${t ? "bg-teal" : "bg-line"}`} /><span className={`flex-1 ${t ? "" : "text-muted"}`}>{l}</span><span className="font-mono text-xs text-muted">{when(t)}</span></li>
              ))}
            </ol>
          </section>
        </div>
        <div className="border-t border-line px-6 py-4">
          <a href={`/receipt/${o.id}`} target="_blank" rel="noopener" className="btn btn-outline w-fit">Open receipt<ExternalLink size={14} aria-hidden /></a>
        </div>
      </div>
    </div>
  );
}
