"use client";
import { useId, useState } from "react";

type Point = { label: string; value: number };
type Kind = "usd" | "count";
// formatter chosen by name: functions cannot be passed from the server page to this client component
const fmt = (kind: Kind, n: number) => (kind === "usd" ? `$${Math.round(n).toLocaleString("en-US")}` : Math.round(n).toLocaleString("en-US"));

/** Rounds the axis max up to 1, 2 or 5 × 10^n so gridlines land on round numbers. */
function niceMax(v: number) {
  if (v <= 0) return 1; // empty chart: axis 0..1, gridlines 0 and 1 only
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v)!;
}

/**
 * One-series column chart (time on x). Single hue, thin bars with 4px rounded tops on the baseline,
 * 2px gaps, three recessive gridlines, sparse x labels, hover/focus tooltip per bar, and a data table.
 */
export function BarChart({ data, kind, title, unit }: { data: Point[]; kind: Kind; title: string; unit: string }) {
  const format = (n: number) => fmt(kind, n);
  const [hover, setHover] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const id = useId();
  const ROWS = 10; // table view, 10 rows per page
  const pages = Math.max(1, Math.ceil(data.length / ROWS));
  const empty = data.every((d) => d.value === 0);
  const W = 640, H = 200, L = 48, B = 24, T = 8;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const bw = (W - L) / Math.max(1, data.length);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const every = Math.ceil(data.length / 8); // at most ~8 x labels
  const h = hover !== null ? data[hover] : null;
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t`}>
          <title id={`${id}-t`}>{title}</title>
          {/* a middle gridline only when it lands on a whole number */}
          {(max >= 2 ? [0, 0.5, 1] : [0, 1]).map((f) => (
            <g key={f}>
              <line x1={L} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="#E5E5E5" strokeWidth={1} />
              <text x={L - 8} y={y(max * f) + 4} textAnchor="end" className="fill-[#737373] font-mono text-[11px]">{format(max * f)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = L + i * bw, top = y(d.value), hgt = H - B - top;
            const w = Math.max(1, bw - 2); // 2px gap between bars
            return (
              <g key={i}>
                {d.value > 0 && (
                  <path
                    d={`M${x + 1},${H - B} V${top + Math.min(4, hgt)} q0,-${Math.min(4, hgt)} ${Math.min(4, w / 2)},-${Math.min(4, hgt)} H${x + 1 + w - Math.min(4, w / 2)} q${Math.min(4, w / 2)},0 ${Math.min(4, w / 2)},${Math.min(4, hgt)} V${H - B} Z`}
                    fill={hover === i ? "#005A53" : "#006F66"}
                  />
                )}
                {/* hit target: the whole column, bigger than the bar */}
                <rect x={x} y={T} width={bw} height={H - T - B} fill="transparent" tabIndex={0} aria-label={`${d.label}: ${format(d.value)}`}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
                {i % every === 0 && <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="fill-[#737373] text-[11px]">{d.label}</text>}
              </g>
            );
          })}
          <line x1={L} x2={W} y1={H - B} y2={H - B} stroke="#D4D4D4" strokeWidth={1} />
        </svg>
        {empty && <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-muted">Nothing in this range yet.</p>}
        {h && hover !== null && (
          <div role="status" className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-sm"
            style={{ left: `${((L + hover * bw + bw / 2) / W) * 100}%` }}>
            <p className="font-mono text-sm font-medium">{format(h.value)}</p>
            <p className="text-muted">{h.label} · {unit}</p>
          </div>
        )}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full max-w-sm">
          <tbody>{data.slice(page * ROWS, page * ROWS + ROWS).map((d, i) => <tr key={i} className="border-t border-line"><td className="py-1">{d.label}</td><td className="py-1 text-right font-mono">{format(d.value)}</td></tr>)}</tbody>
        </table>
        {pages > 1 && (
          <div className="mt-2 flex max-w-sm items-center justify-between">
            <span className="text-muted">Rows {page * ROWS + 1}–{Math.min(data.length, page * ROWS + ROWS)} of {data.length}</span>
            <span className="flex items-center gap-1">
              <button type="button" className="btn btn-outline min-h-8 px-2 py-0 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn-outline min-h-8 px-2 py-0 text-xs" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
            </span>
          </div>
        )}
      </details>
    </figure>
  );
}

/** Ranked horizontal bars with the value written beside each bar (no hover needed: every value is visible). */
export function RankBars({ rows, kind, empty }: { rows: { name: string; value: number; note?: string }[]; kind: Kind; empty: string }) {
  const format = (n: number) => fmt(kind, n);
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.name} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{r.name}</span>
            <span className="shrink-0 font-mono">{format(r.value)}{r.note && <span className="text-muted"> · {r.note}</span>}</span>
          </div>
          <span className="h-2 rounded bg-surface-2" aria-hidden><span className="block h-full rounded bg-teal" style={{ width: `${Math.max(1, (r.value / max) * 100)}%` }} /></span>
        </li>
      ))}
    </ul>
  );
}
