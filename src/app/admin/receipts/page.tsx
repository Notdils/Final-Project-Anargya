import { guardPage } from "@/lib/admin-guard";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { PAGE_SIZE, parseDays, parseStatus, receipts } from "@/lib/admin";
import { RangeSelect } from "@/components/admin/range-select";
import { OrderStatusBadge } from "@/components/status-badge";
import { jst, rupiah } from "@/lib/format";
import { orderAmount } from "@/lib/money";

export const metadata = { title: "Receipts" };

type SP = { q?: string; status?: string; days?: string; page?: string };

export default async function AdminReceipts({ searchParams }: { searchParams: Promise<SP> }) {
  await guardPage("receipts.read");
  const sp = await searchParams;
  const f = { q: (sp.q ?? "").slice(0, 60), status: parseStatus(sp.status), days: parseDays(sp.days), page: Math.max(1, Number(sp.page) || 1) };
  const r = await receipts(f);
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams({ days: String(f.days), ...(f.q ? { q: f.q } : {}), ...(f.status !== "all" ? { status: f.status } : {}) });
    Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
    return p.toString();
  };
  const pages = Math.max(1, Math.ceil((r?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Receipts</h1>
        <div className="flex gap-2">
          <a href={`/api/admin/export?${qs({ format: "csv" })}`} className="btn btn-outline"><Download size={16} aria-hidden />Export CSV</a>
          <a href={`/api/admin/export?${qs({ format: "xlsx" })}`} className="btn btn-ochre"><Download size={16} aria-hidden />Export XLSX</a>
        </div>
      </div>

      <form className="flex flex-col gap-2 md:flex-row" action="/admin/receipts">
        <input type="hidden" name="days" value={f.days} />
        <label className="relative flex-1">
          <span className="sr-only">Search receipts</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={f.q} className="input pl-9" placeholder="Search receipt no, buyer, email" />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={f.status} className="input w-auto pr-8">
            <option value="all">Status: All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
            <option value="review">Needs review</option>
          </select>
        </label>
        <button className="btn btn-outline">Apply</button>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <RangeSelect days={f.days} />
        <p className="text-xs text-muted">Export uses these filters. Columns are a draft until Finance (FAB) confirms the fields.</p>
      </div>

      {r && r.rows.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead className="bg-surface">
                <tr className="eyebrow text-left text-muted">
                  {["Receipt", "Buyer", "Created", "Total (JPY)", "Charged (IDR)", "Method", "Status"].map((h) => (
                    <th key={h} className={`px-4 py-3 font-medium ${h.startsWith("Total") || h.startsWith("Charged") ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.rows.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="px-4 py-3 font-mono"><Link href={`/receipt/${o.id}`} className="text-teal hover:underline">{o.receipt_no}</Link></td>
                    <td className="px-4 py-3">{o.buyer_name}<br /><span className="text-xs text-muted">{o.email}</span></td>
                    <td className="px-4 py-3 font-mono">{jst(o.created_at)}</td>
                    <td className="px-4 py-3 text-right font-mono">{orderAmount(o)}</td>
                    <td className="px-4 py-3 text-right font-mono">{rupiah(o.charged_idr)}</td>
                    <td className="px-4 py-3">{o.method ?? "—"}</td>
                    <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><OrderStatusBadge status={o.status} />{o.oversold && <span className="inline-flex items-center gap-1 rounded bg-oxide px-1.5 py-0.5 text-xs font-medium text-white"><AlertTriangle size={12} aria-hidden />Refund or restock</span>}{o.needs_review && <span title={o.review_note ?? undefined} className="inline-flex items-center gap-1 rounded bg-oxide px-1.5 py-0.5 text-xs font-medium text-white"><AlertTriangle size={12} aria-hidden />Needs review</span>}{o.needs_review && o.review_note && <span className="max-w-[200px] text-xs text-oxide">{o.review_note}</span>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Pagination" className="flex items-center justify-between">
            <p className="text-[13px] text-muted">{r.total} receipts</p>
            <div className="flex gap-1">
              <Link aria-disabled={f.page <= 1} href={`/admin/receipts?${qs({ page: f.page - 1 })}`} className="btn btn-outline px-2 aria-disabled:pointer-events-none aria-disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} aria-hidden /></Link>
              <Link aria-disabled={f.page >= pages} href={`/admin/receipts?${qs({ page: f.page + 1 })}`} className="btn btn-outline px-2 aria-disabled:pointer-events-none aria-disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} aria-hidden /></Link>
            </div>
          </nav>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No receipts match these filters.</p>
      )}
    </div>
  );
}
