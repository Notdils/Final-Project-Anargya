import { guardPage } from "@/lib/admin-guard";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CreditCard, MoreHorizontal, Package } from "lucide-react";
import { RANGES, overviewStats, parseRange } from "@/lib/admin-stats";
import { BarChart, RankBars } from "@/components/admin/bar-chart";
import { OrderStatusBadge } from "@/components/status-badge";
import { jst } from "@/lib/format";
import { orderAmount, usd } from "@/lib/money";

export const metadata = { title: "Overview" };

const LABEL: Record<string, string> = { home: "Home", marketplace: "Marketplace", part: "Part detail", checkout: "Checkout started", paid: "Paid" };

function Delta({ d }: { d?: number | null }) {
  if (d === undefined) return null;
  if (d === null || !Number.isFinite(d)) return <span className="text-xs text-muted">No earlier data</span>;
  const up = d >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${up ? "text-teal" : "text-oxide"}`}>
      {up ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}
      {up ? "+" : ""}{d.toFixed(1)}% <span className="text-muted">vs previous period</span>
    </span>
  );
}

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await guardPage("overview.read");
  const range = parseRange((await searchParams).range);
  const d = await overviewStats(range);
  const top = Math.max(1, ...(d?.funnel.map((s) => s.n) ?? [1]));
  const k = d?.kpi;
  const kpis: [string, string, React.ReactNode][] = [
    ["Revenue", k ? usd(k.revenue.v) : "–", <Delta key="r" d={k?.revenue.d} />],
    ["Paid orders", k ? String(k.orders.v) : "–", <Delta key="o" d={k?.orders.d} />],
    ["Average order value", k ? usd(Math.round(k.aov.v)) : "–", <Delta key="a" d={k?.aov.d} />],
    ["Checkout → paid", k?.conversion.v != null ? `${k.conversion.v.toFixed(1)}%` : "–", <span key="c" className="text-xs text-muted">Sessions that started checkout and paid</span>],
    ["New customers", k?.newCustomers.v != null ? String(k.newCustomers.v) : "–", k?.newCustomers.v != null ? <Delta key="n" d={k.newCustomers.d} /> : <span key="n" className="text-xs text-muted">Needs the service key</span>],
    ["Paid consultations", k ? String(k.consultations.v) : "–", <span key="b" className="text-xs text-muted">{k ? `${usd(k.consultations.revenue)} in fees` : ""}</span>],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Overview</h1>
          <p className="text-sm text-muted">{range.long}, JST. Revenue counts paid orders in USD.</p>
        </div>
        <nav aria-label="Range" className="flex gap-1 rounded-lg border border-line p-1 text-sm">
          {RANGES.map((r) => (
            <Link key={r.id} href={`/admin?range=${r.id}`} aria-current={r.id === range.id ? "page" : undefined} title={r.long}
              className={`min-w-10 rounded-md px-3 py-1.5 text-center font-mono ${r.id === range.id ? "bg-teal text-white" : "text-muted hover:bg-surface"}`}>{r.label}</Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section aria-labelledby="rev-chart" className="flex flex-col gap-3 rounded-xl border border-line p-5">
          <h2 id="rev-chart" className="font-semibold">Revenue <span className="font-normal text-muted">per {range.bucket}</span></h2>
          {d ? <BarChart data={d.series.map((b) => ({ label: b.label, value: b.revenue }))} kind="usd" unit="revenue" title={`Revenue per ${range.bucket}, ${range.long}`} /> : <p className="text-sm text-muted">Connect Supabase to see data.</p>}
        </section>
        <section aria-labelledby="ord-chart" className="flex flex-col gap-3 rounded-xl border border-line p-5">
          <h2 id="ord-chart" className="font-semibold">Paid orders <span className="font-normal text-muted">per {range.bucket}</span></h2>
          {d ? <BarChart data={d.series.map((b) => ({ label: b.label, value: b.orders }))} kind="count" unit="paid orders" title={`Paid orders per ${range.bucket}, ${range.long}`} /> : <p className="text-sm text-muted">Connect Supabase to see data.</p>}
        </section>
        <section aria-labelledby="by-product" className="flex flex-col gap-4 rounded-xl border border-line p-5">
          <div>
            <h2 id="by-product" className="font-semibold">Revenue by part</h2>
            <p className="text-xs text-muted">Which parts bring the money, and how many units.</p>
          </div>
          <RankBars rows={(d?.products ?? []).map((p) => ({ name: p.name, value: p.revenue, note: `${p.units} ${p.units === 1 ? "unit" : "units"}` }))} kind="usd" empty="No paid orders in this range." />
        </section>
        <section aria-labelledby="by-dest" className="flex flex-col gap-4 rounded-xl border border-line p-5">
          <div>
            <h2 id="by-dest" className="font-semibold">Revenue by destination</h2>
            <p className="text-xs text-muted">Where paid orders ship. Top 8.</p>
          </div>
          <RankBars rows={(d?.destinations ?? []).map((x) => ({ name: x.name, value: x.revenue, note: `${x.orders} ${x.orders === 1 ? "order" : "orders"}` }))} kind="usd" empty="No paid orders in this range." />
        </section>
      </div>

      {d && (d.actions.review > 0 || d.actions.toPack > 0 || d.actions.waiting > 0) && (
        <ul className="flex flex-col gap-2 md:flex-row">
          {d.actions.review > 0 && (
            <li className="flex-1"><Link href="/admin/orders?tab=review" className="flex h-full items-start gap-3 rounded-lg bg-oxide-tint p-4 text-sm text-oxide hover:underline">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /><span><strong>{d.actions.review} need review.</strong> Midtrans reported a different amount.</span></Link></li>
          )}
          {d.actions.toPack > 0 && (
            <li className="flex-1"><Link href="/admin/orders?tab=to_pack" className="flex h-full items-start gap-3 rounded-lg bg-teal-tint p-4 text-sm text-teal hover:underline">
              <Package size={18} className="mt-0.5 shrink-0" aria-hidden /><span><strong>{d.actions.toPack} to pack.</strong> Paid and waiting to ship.</span></Link></li>
          )}
          {d.actions.waiting > 0 && (
            <li className="flex-1"><Link href="/admin/orders?tab=waiting" className="flex h-full items-start gap-3 rounded-lg bg-surface p-4 text-sm hover:underline">
              <CreditCard size={18} className="mt-0.5 shrink-0" aria-hidden /><span><strong>{d.actions.waiting} waiting for payment.</strong></span></Link></li>
          )}
        </ul>
      )}

      <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {kpis.map(([label, v, sub]) => (
          <li key={label} className="flex min-w-0 flex-col gap-2 rounded-xl border border-line p-4 md:p-5">
            <span className="text-[13px] text-muted">{label}</span>
            <span className="truncate font-mono text-xl font-medium md:text-2xl">{v}</span>
            {sub}
          </li>
        ))}
      </ul>

      <section aria-labelledby="funnel" className="flex flex-col gap-4 rounded-xl border border-line p-5">
        <div>
          <h2 id="funnel" className="font-semibold">Conversion funnel</h2>
          <p className="text-xs text-muted">Unique sessions per step (first-party events), paid = paid orders.</p>
        </div>
        {d && d.funnel.length ? (
          <ol className="flex flex-col gap-3">
            {d.funnel.map((s, i) => {
              const prev = i ? d.funnel[i - 1].n : 0;
              const pct = i === 0 ? 100 : prev ? (s.n / prev) * 100 : 0;
              return (
                <li key={s.step} className="grid grid-cols-1 gap-1.5 md:grid-cols-[128px_1fr_112px] md:items-center md:gap-4">
                  <span className="text-[13px]">{LABEL[s.step] ?? s.step}</span>
                  <span className="h-6 rounded bg-surface-2" aria-hidden>
                    <span className="block h-full rounded bg-teal" style={{ width: `${Math.max(1, (s.n / top) * 100)}%` }} />
                  </span>
                  <span className="font-mono text-xs text-[#404040] md:text-right">{s.n.toLocaleString()} · {i === 0 ? "100" : pct.toFixed(1)}%</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted">No events yet.</p>
        )}
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="font-semibold">Latest 10 orders <span className="font-normal text-muted">in this range</span></h2>
          <Link href="/admin/receipts" className="text-sm font-medium text-teal hover:underline">View all</Link>
        </div>
        {d?.recent.length ? (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead className="bg-surface">
                <tr className="eyebrow text-left text-muted">
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="px-4 py-3 font-mono">{o.receipt_no}</td>
                    <td className="px-4 py-3">{o.buyer_name}</td>
                    <td className="px-4 py-3 font-mono">{jst(o.created_at)}</td>
                    <td className="px-4 py-3 text-right font-mono">{orderAmount(o)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-4 py-3"><Link href={`/receipt/${o.id}`} aria-label={`Open ${o.receipt_no}`}><MoreHorizontal size={16} className="text-muted" aria-hidden /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No orders in this range.</p>
        )}
      </section>
    </div>
  );
}
