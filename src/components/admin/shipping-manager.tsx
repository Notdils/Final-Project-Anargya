"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { JP_REGIONS, type Zone } from "@/lib/shipping";

const regionHint = (code: string) => JP_REGIONS.find((r) => r.code === code)?.hint;

type Draft = { rate: string; min: string; max: string; active: boolean };
const toDraft = (z: Zone): Draft => ({ rate: z.rateUsd === null ? "" : String(z.rateUsd), min: z.minDays === null ? "" : String(z.minDays), max: z.maxDays === null ? "" : String(z.maxDays), active: z.active });
const num = (s: string) => (s.trim() === "" ? null : Number(s));

function Row({ z, flatUsd, live, onSaved }: { z: Zone; flatUsd: number; live: boolean; onSaved: (m: string) => void }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(toDraft(z));
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(z));

  async function save() {
    const e: Record<string, string> = {};
    const rate = num(d.rate), min = num(d.min), max = num(d.max);
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || Math.round(rate * 100) !== rate * 100)) e.rate = "0 or more, 2 decimals max.";
    for (const [k, v] of [["min", min], ["max", max]] as const) if (v !== null && (!Number.isInteger(v) || v < 0 || v > 120)) e[k] = "Whole days, 0 to 120.";
    if (!e.min && !e.max && min !== null && max !== null && min > max) e.max = "At least the minimum.";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await fetch(`/api/admin/shipping/${z.code}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ rate_usd: rate, min_days: min, max_days: max, active: d.active }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      const f = data?.fields ?? {};
      setErr({ rate: f.rate_usd?.[0], min: f.min_days?.[0], max: f.max_days?.[0], form: data?.error ?? "Could not save." });
      return;
    }
    onSaved(`${z.name} saved.`);
    router.refresh();
  }

  const cell = (k: "rate" | "min" | "max", label: string, w: string, ph: string) => (
    <td className="px-2 py-2 align-top">
      <label className="sr-only" htmlFor={`${z.code}-${k}`}>{label} for {z.name}</label>
      <input id={`${z.code}-${k}`} inputMode="decimal" className={`input h-10 ${w} font-mono`} placeholder={ph} value={d[k]} aria-invalid={Boolean(err[k])}
        onChange={(e) => setD({ ...d, [k]: e.target.value })} disabled={!live} />
      {err[k] && <p className="mt-1 text-xs text-oxide">{err[k]}</p>}
    </td>
  );

  return (
    <tr className="border-t border-line">
      <td className="px-4 py-3 align-top">
        <p className="font-medium">{z.name}</p>
        <p className="font-mono text-xs text-muted">{z.code}{regionHint(z.code) ? ` · ${regionHint(z.code)}` : ""}</p>
      </td>
      {cell("rate", "Rate in USD", "w-28", flatUsd ? `${flatUsd} (flat)` : "Flat")}
      {cell("min", "Minimum days", "w-20", "–")}
      {cell("max", "Maximum days", "w-20", "–")}
      <td className="px-2 py-3 align-top">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#006F66]" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} disabled={!live} />
          {d.active ? "On" : "Off"}
        </label>
      </td>
      <td className="px-4 py-2 text-right align-top">
        <button type="button" className="btn-dark h-10 px-4 text-sm disabled:opacity-40" disabled={!live || !dirty || busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        {err.form && <p className="mt-1 text-xs text-oxide">{err.form}</p>}
      </td>
    </tr>
  );
}

export function ShippingManager({ zones, flatUsd, live }: { zones: Zone[]; flatUsd: number; live: boolean }) {
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const match = (z: Zone) => !q.trim() || `${z.name} ${z.code}`.toLowerCase().includes(q.trim().toLowerCase());
  const jp = useMemo(() => zones.filter((z) => z.kind === "jp_region" && match(z)), [zones, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const intl = useMemo(() => zones.filter((z) => z.kind === "country" && match(z)), [zones, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const unrated = zones.filter((z) => z.active && z.rateUsd === null).length;

  const table = (title: string, rows: Zone[]) => (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface"><tr className="eyebrow text-left text-muted">
            <th className="px-4 py-3 font-medium">Zone</th><th className="px-2 py-3 font-medium">Rate (USD)</th><th className="px-2 py-3 font-medium">Min days</th>
            <th className="px-2 py-3 font-medium">Max days</th><th className="px-2 py-3 font-medium">Ships</th><th className="w-28" />
          </tr></thead>
          <tbody>
            {rows.map((z) => <Row key={`${z.code}-${z.rateUsd}-${z.minDays}-${z.maxDays}-${z.active}`} z={z} flatUsd={flatUsd} live={live} onSaved={flash} />)}
            {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No zones match.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Shipping Cost</h1>
        <p className="text-sm text-muted">Rates by destination. Checkout asks for the country and, in Japan, East or West; the server charges the zone rate. An empty rate uses the flat rate ({flatUsd ? `$${flatUsd}` : "free"}).</p>
      </header>
      {!live && <p className="flex items-start gap-2 rounded-lg bg-ochre-tint p-3 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />Read-only preview. Run SQL 0013 in Supabase to edit rates.</p>}
      {live && unrated > 0 && <p className="flex items-start gap-2 rounded-lg bg-surface p-3 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />{unrated} active zones still use the flat rate. Fill them in when the shipping partner sends rates.</p>}
      <label className="relative md:max-w-sm">
        <span className="sr-only">Search zones</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input className="input pl-9" placeholder="Search country or region" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {table("Japan (East / West)", jp)}
      {table("Asia", intl)}
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black px-4 py-3 text-sm text-white">{toast}</div>}
    </div>
  );
}
