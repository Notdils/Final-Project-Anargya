import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers to show: first, last, current ±1, with gaps ("…"). */
function pagesToShow(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/**
 * Offset pagination for admin tables: "Showing 21–40 of 132", previous / next and page numbers.
 * The page lives in the URL (?page=), so filters, refresh and the back button keep it.
 */
export function Pagination({ page, pageSize, total, href, noun = "results" }: { page: number; pageSize: number; total: number; href: (page: number) => string; noun?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const btn = "btn btn-outline min-w-10 px-2 aria-disabled:pointer-events-none aria-disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-[13px] text-muted">Showing <span className="font-mono">{from}–{to}</span> of <span className="font-mono">{total}</span> {noun}</p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={href(Math.max(1, page - 1))} className={btn} aria-label="Previous page"><ChevronLeft size={16} aria-hidden /></Link>
          {pagesToShow(page, pages).map((p, i) =>
            p === "…" ? <span key={`gap${i}`} className="px-1 text-muted">…</span> : (
              <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={`${btn} font-mono text-sm ${p === page ? "border-teal bg-teal-tint text-teal" : ""}`}>{p}</Link>
            ),
          )}
          <Link aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} href={href(Math.min(pages, page + 1))} className={btn} aria-label="Next page"><ChevronRight size={16} aria-hidden /></Link>
        </div>
      )}
    </nav>
  );
}
