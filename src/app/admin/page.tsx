import { guardPage } from "@/lib/admin-guard";
import Link from "next/link";
import { AlertTriangle, MoreHorizontal } from "lucide-react";
import { overview, parseDays } from "@/lib/admin";
import { RangeSelect } from "@/components/admin/range-select";
import { OrderStatusBadge } from "@/components/status-badge";
import { jst } from "@/lib/format";
import { orderAmount, usd } from "@/lib/money";

export const metadata = { title: "Overview" };

const LABEL: Record<string, string> = { home: "Home", marketplace: "Marketplace", part: "Part detail", checkout: "Checkout started", paid: "Paid" };

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await guardPage("overview.read");
  const days = parseDays((await searchParams).days);
  const d = await overview(days);
  const top = Math.max(1, ...(d?.funnel.map((s) => s.n) ?? [1]));
  const kpis = [
    ["Revenue (USD)", d ? usd(d.revenue) : "-", "Paid orders only"],
    ["Paid orders", d ? String(d.paid) : "—", `Last ${days} days`],
    ["Pending payment", d ? String(d.pending) : "—", "Awaiting Midtrans"],
    ["Conversion", d?.conversion != null ? `${d.conversion.toFixed(1)}%` : "—", "Home → Paid"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Overview</h1>
        <RangeSelect days={days} />
      </div>

      {d && d.needsReview > 0 && (
        <Link href="/admin/receipts?status=review&days=90" role="alert" className="flex items-start gap-3 rounded-lg bg-oxide-tint p-4 text-sm text-oxide hover:underline">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>{d.needsReview} {d.needsReview === 1 ? "order needs" : "orders need"} review.</strong> Midtrans reported a different amount than we charged. They stay unpaid until Finance checks them in the Midtrans dashboard.
          </span>
        </Link>
      )}

      <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map(([k, v, s]) => (
          <li key={k} className="flex min-w-0 flex-col gap-2 rounded-xl border border-line p-4 md:p-5">
            <span className="text-[13px] text-muted">{k}</span>
            <span className="truncate font-mono text-xl font-medium md:text-2xl">{v}</span>
            <span className="text-xs text-muted">{s}</span>
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
          <h2 id="recent" className="font-semibold">Recent orders</h2>
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
                  <th className="px-4 py-3 text-right font-medium">Total (JPY)</th>
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
