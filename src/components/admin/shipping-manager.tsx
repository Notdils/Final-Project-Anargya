"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { JP_REGIONS, type Region, type Zone } from "@/lib/shipping";

type Part = { id: string; name: string; code: string };
const regionHint = (code: string) => JP_REGIONS.find((r) => r.code === code)?.hint;
const num = (s: string) => (s.trim() === "" ? null : Number(s));
const money = (v: number | null) => v !== null && Number.isFinite(v) && v >= 0 && Math.round(v * 100) === v * 100;

async function patch(url: string, body: unknown) {
  const res = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  return { ok: Boolean(res?.ok), error: (data?.error as string) ?? "Could not save." };
}

/** One DHL region: delivery days and the rate per box for each part. */
function RegionRow({ r, parts, countries, live, onSaved }: { r: Region; parts: Part[]; countries: string; live: boolean; onSaved: (m: string) => void }) {
  const router = useRouter();
  const init = () => ({ min: r.minDays === null ? "" : String(r.minDays), max: r.maxDays === null ? "" : String(r.maxDays), rates: Object.fromEntries(parts.map((p) => [p.id, r.rates[p.id] === undefined ? "" : String(r.rates[p.id])])) as Record<string, string> });
  const [d, setD] = useState(init);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(init());

  async function save() {
    const min = num(d.min), max = num(d.max);
    const rates: Record<string, number> = {};
    for (const p of parts) {
      const v = num(d.rates[p.id]);
      if (v === null) continue;
      if (!money(v)) return setErr(`${p.code}: 0 or more, 2 decimals max.`);
      rates[p.id] = v;
    }
    for (const v of [min, max]) if (v !== null && (!Number.isInteger(v) || v < 0 || v > 120)) return setErr("Days: whole numbers, 0 to 120.");
    if (min !== null && max !== null && min > max) return setErr("Max days must be at least min days.");
    setErr(""); setBusy(true);
    const res = await patch(`/api/admin/shipping/regions/${r.code}`, { min_days: min, max_days: max, rates });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    onSaved(`${r.name} saved.`);
    router.refresh();
  }

  const input = (id: string, label: string, value: string, set: (v: string) => void, w: string) => (
    <>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input id={id} inputMode="decimal" className={`input h-10 ${w} font-mono`} placeholder="–" value={value} onChange={(e) => set(e.target.value)} disabled={!live} />
    </>
  );

  return (
    <tr className="border-t border-line">
      <td className="px-4 py-3 align-top">
        <p className="font-medium">{r.name}</p>
        <p className="font-mono text-xs text-muted">{r.dhlZone ?? r.code}</p>
        <p className="mt-1 max-w-[220px] text-xs text-muted">{countries || "No active countries"}</p>
      </td>
      <td className="px-2 py-2 align-top">
        <div className="flex items-center gap-1">
          {input(`${r.code}-min`, `Minimum days for ${r.name}`, d.min, (v) => setD({ ...d, min: v }), "w-14")}
          <span className="text-muted">–</span>
          {input(`${r.code}-max`, `Maximum days for ${r.name}`, d.max, (v) => setD({ ...d, max: v }), "w-14")}
        </div>
      </td>
      {parts.map((p) => (
        <td key={p.id} className="px-2 py-2 align-top">{input(`${r.code}-${p.id}`, `${p.name} rate for ${r.name}`, d.rates[p.id], (v) => setD({ ...d, rates: { ...d.rates, [p.id]: v } }), "w-24")}</td>
      ))}
      <td className="px-4 py-2 text-right align-top">
        <button type="button" className="btn-dark h-10 px-4 text-sm disabled:opacity-40" disabled={!live || !dirty || busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        {err && <p className="mt-1 text-xs text-oxide">{err}</p>}
      </td>
    </tr>
  );
}

/** One destination: on/off. Japan rows note that the customer pays the courier. */
function ZoneRow({ z, regionName, live, onSaved }: { z: Zone; regionName: string; live: boolean; onSaved: (m: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function toggle(active: boolean) {
    setBusy(true);
    const res = await patch(`/api/admin/shipping/${z.code}`, { active });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    setErr(""); onSaved(`${z.name} ${active ? "on" : "off"}.`);
    router.refresh();
  }
  return (
    <tr className="border-t border-line">
      <td className="px-4 py-3"><p className="font-medium">{z.name}</p><p className="font-mono text-xs text-muted">{z.code}{regionHint(z.code) ? ` · ${regionHint(z.code)}` : ""}</p></td>
      <td className="px-2 py-3 text-muted">{z.kind === "jp_region" || z.code === "JP" ? "Customer pays the courier on delivery" : regionName}</td>
      <td className="px-4 py-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[#006F66]" checked={z.active} onChange={(e) => toggle(e.target.checked)} disabled={!live || busy} />
          {z.active ? "On" : "Off"}
        </label>
        {err && <p className="mt-1 text-xs text-oxide">{err}</p>}
      </td>
    </tr>
  );
}

export function ShippingManager({ zones, regions, parts, flatUsd, live }: { zones: Zone[]; regions: Region[]; parts: Part[]; flatUsd: number; live: boolean }) {
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const regionName = (code: string | null) => regions.find((r) => r.code === code)?.name ?? "No rate region (flat rate)";
  const shown = useMemo(() => zones.filter((z) => !q.trim() || `${z.name} ${z.code}`.toLowerCase().includes(q.trim().toLowerCase())), [zones, q]);
  const countriesOf = (code: string) => zones.filter((z) => z.region === code && z.active).map((z) => z.name).join(", ");
  const missing = regions.reduce((n, r) => n + parts.filter((p) => r.rates[p.id] === undefined).length, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Shipping Costs</h1>
        <p className="text-sm text-muted">DHL Express rates in USD, per box. An order pays qty × rate for every part, by the destination&apos;s region. Japan (one destination): the customer pays the courier on delivery, so checkout charges nothing. A part without a rate uses the flat rate ({flatUsd ? `$${flatUsd}` : "free"}).</p>
      </header>
      {!live && <p className="flex items-start gap-2 rounded-lg bg-ochre-tint p-3 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />Read-only preview. Run supabase/master.sql to edit rates.</p>}
      {live && !regions.length && <p className="flex items-start gap-2 rounded-lg bg-ochre-tint p-3 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />DHL rates are not in the database yet. Run supabase/master.sql (migration 0025).</p>}
      {live && missing > 0 && <p className="flex items-start gap-2 rounded-lg bg-surface p-3 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />{missing} part rates are empty and use the flat rate.</p>}

      {regions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">DHL rates by region (USD per box)</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-surface"><tr className="eyebrow text-left text-muted">
                <th className="px-4 py-3 font-medium">Region</th><th className="px-2 py-3 font-medium">Days</th>
                {parts.map((p) => <th key={p.id} className="px-2 py-3 font-medium" title={p.name}>{p.code}</th>)}
                <th className="w-28" />
              </tr></thead>
              <tbody>
                {regions.map((r) => <RegionRow key={`${r.code}-${JSON.stringify(r)}`} r={r} parts={parts} countries={countriesOf(r.code)} live={live} onSaved={flash} />)}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">{parts.map((p) => `${p.code}: ${p.name}`).join(" · ")}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Destinations</h2>
        <label className="relative md:max-w-sm">
          <span className="sr-only">Search destinations</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Search country or region" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface"><tr className="eyebrow text-left text-muted">
              <th className="px-4 py-3 font-medium">Destination</th><th className="px-2 py-3 font-medium">Rates</th><th className="px-4 py-3 font-medium">Ships</th>
            </tr></thead>
            <tbody>
              {shown.map((z) => <ZoneRow key={`${z.code}-${z.active}`} z={z} regionName={regionName(z.region)} live={live} onSaved={flash} />)}
              {!shown.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">No destinations match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black px-4 py-3 text-sm text-white">{toast}</div>}
    </div>
  );
}
