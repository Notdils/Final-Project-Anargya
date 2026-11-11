"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";

export type VoucherRow = {
  code: string; description: string | null; kind: "percent" | "fixed"; value: number | string; max_discount_usd: number | string | null;
  min_subtotal_usd: number | string; starts_at: string; ends_at: string | null; max_uses: number | null; per_user_limit: number;
  product_ids: string[] | null; active: boolean; uses: number; discountGiven: number;
};

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Tokyo" });

function state(v: VoucherRow): [string, string] {
  const now = Date.now();
  if (!v.active) return ["Off", "bg-surface-2 text-muted"];
  if (Date.parse(v.starts_at) > now) return ["Scheduled", "bg-ochre-tint text-ink"];
  if (v.ends_at && Date.parse(v.ends_at) <= now) return ["Ended", "bg-surface-2 text-muted"];
  if (v.max_uses && v.uses >= v.max_uses) return ["Used up", "bg-surface-2 text-muted"];
  return ["Live", "bg-teal-tint text-teal"];
}

export function VouchersManager({ rows, products, live }: { rows: VoucherRow[]; products: { id: string; name: string }[]; live: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  async function toggle(v: VoucherRow) {
    setBusy(v.code);
    const res = await fetch(`/api/admin/vouchers/${v.code}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !v.active }) }).catch(() => null);
    setBusy("");
    if (!res?.ok) return flash("Could not save.");
    flash(`${v.code} turned ${v.active ? "off" : "on"}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Vouchers</h1>
          <p className="text-sm text-muted">Discount codes for promos (e.g. Christmas). The discount comes off the parts subtotal, not shipping. A use counts while its order is pending or paid.</p>
        </div>
        <button type="button" className="btn btn-teal" disabled={!live} onClick={() => setOpen(true)}><Plus size={16} aria-hidden />New voucher</button>
      </div>
      {!live && <p className="flex items-start gap-2 rounded-lg bg-ochre-tint p-3 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />Read-only preview. Run SQL 0016 and set the service key to manage vouchers.</p>}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[880px] text-[13px]">
          <thead className="bg-surface"><tr className="eyebrow text-left text-muted">
            <th className="px-4 py-3 font-medium">Code</th><th className="px-4 py-3 font-medium">Discount</th><th className="px-4 py-3 font-medium">Rules</th>
            <th className="px-4 py-3 font-medium">Valid (JST)</th><th className="px-4 py-3 text-right font-medium">Used</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3" />
          </tr></thead>
          <tbody>
            {rows.map((v) => {
              const [label, cls] = state(v);
              const parts = v.product_ids?.length ? v.product_ids.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ") : "All parts";
              return (
                <tr key={v.code} className="border-t border-line align-top">
                  <td className="px-4 py-3"><p className="font-mono font-medium">{v.code}</p>{v.description && <p className="text-muted">{v.description}</p>}</td>
                  <td className="px-4 py-3 font-mono">{v.kind === "percent" ? `${Number(v.value)}%` : usd(Number(v.value))}{v.max_discount_usd ? <span className="block text-muted">max {usd(Number(v.max_discount_usd))}</span> : null}</td>
                  <td className="px-4 py-3 text-muted">{Number(v.min_subtotal_usd) > 0 ? `Min ${usd(Number(v.min_subtotal_usd))} · ` : ""}{v.per_user_limit}× per customer<br />{parts}</td>
                  <td className="px-4 py-3 font-mono">{day(v.starts_at)} – {v.ends_at ? day(v.ends_at) : "no end"}</td>
                  <td className="px-4 py-3 text-right font-mono">{v.uses}{v.max_uses ? ` / ${v.max_uses}` : ""}<span className="block text-muted">−{usd(v.discountGiven)}</span></td>
                  <td className="px-4 py-3"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span></td>
                  <td className="px-4 py-3 text-right"><button type="button" className="btn btn-outline min-h-8 px-3 py-1 text-xs" disabled={busy === v.code || !live} onClick={() => toggle(v)}>{v.active ? "Turn off" : "Turn on"}</button></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No vouchers yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <CreateDialog products={products} onClose={() => setOpen(false)} onDone={(code) => { setOpen(false); flash(`${code} created.`); router.refresh(); }} />}
      {toast && <p role="status" className="fixed bottom-5 right-5 z-[1300] rounded-lg bg-ink px-4 py-2 text-sm text-white">{toast}</p>}
    </div>
  );
}

function CreateDialog({ products, onClose, onDone }: { products: { id: string; name: string }[]; onClose: () => void; onDone: (code: string) => void }) {
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const num = (v: FormDataEntryValue | null) => (String(v ?? "").trim() === "" ? null : Number(v));
  // datetime-local is read as JST, the shop's time zone
  const jst = (v: FormDataEntryValue | null) => (String(v ?? "") ? `${v}:00+09:00` : null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      code: String(f.get("code") ?? "").trim().toUpperCase(), description: String(f.get("description") ?? "").trim() || null, kind,
      value: num(f.get("value")), max_discount_usd: kind === "percent" ? num(f.get("max")) : null, min_subtotal_usd: num(f.get("min")) ?? 0,
      starts_at: jst(f.get("starts")) ?? new Date().toISOString(), ends_at: jst(f.get("ends")), max_uses: num(f.get("uses")),
      per_user_limit: num(f.get("per")) ?? 1, product_ids: f.getAll("parts").map(String),
    };
    setBusy(true); setErr({});
    const res = await fetch("/api/admin/vouchers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      const fl = (data?.fields ?? {}) as Record<string, string[]>;
      setErr({ ...Object.fromEntries(Object.entries(fl).map(([k, v]) => [k, v[0]])), form: data?.error ?? "Could not create the voucher." });
      return;
    }
    onDone(body.code);
  }

  const field = (name: string, label: string, input: React.ReactNode, key = name) => (
    <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">{label}</span>{input}{err[key] && <span className="text-xs text-oxide">{err[key]}</span>}</label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="nv-title" className="fixed inset-0 z-[1200] grid place-items-center bg-black/50 p-4">
      <form onSubmit={submit} className="flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6">
        <div className="flex items-center justify-between"><h2 id="nv-title" className="text-lg font-semibold">New voucher</h2><button type="button" className="btn btn-outline px-2" aria-label="Close" onClick={onClose}><X size={16} aria-hidden /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("code", "Code", <input name="code" className="input font-mono uppercase" placeholder="XMAS2026" maxLength={24} required />)}
          {field("description", "Note (staff only)", <input name="description" className="input" placeholder="Christmas promo" maxLength={200} />)}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["percent", "fixed"] as const).map((k) => (
              <label key={k} className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm ${kind === k ? "border-teal bg-teal-tint text-teal" : "border-line"}`}>
                <input type="radio" name="kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />{k === "percent" ? "Percent off" : "Fixed amount (USD)"}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("value", kind === "percent" ? "Percent" : "Amount (USD)", <input name="value" className="input font-mono" inputMode="decimal" required />)}
          {kind === "percent" && field("max", "Max discount (USD)", <input name="max" className="input font-mono" inputMode="decimal" placeholder="No cap" />, "max_discount_usd")}
          {field("min", "Min subtotal (USD)", <input name="min" className="input font-mono" inputMode="decimal" placeholder="0" />, "min_subtotal_usd")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("starts", "Starts (JST)", <input name="starts" type="datetime-local" className="input" />, "starts_at")}
          {field("ends", "Ends (JST)", <input name="ends" type="datetime-local" className="input" />, "ends_at")}
          {field("uses", "Total uses", <input name="uses" className="input font-mono" inputMode="numeric" placeholder="Unlimited" />, "max_uses")}
          {field("per", "Uses per customer", <input name="per" className="input font-mono" inputMode="numeric" defaultValue={1} />, "per_user_limit")}
        </div>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1.5 font-medium">Applies to <span className="font-normal text-muted">(none ticked = all parts)</span></legend>
          {products.map((p) => <label key={p.id} className="flex items-center gap-2"><input type="checkbox" name="parts" value={p.id} className="size-4 accent-[#006F66]" />{p.name}</label>)}
        </fieldset>
        {err.form && <p className="flex items-center gap-1.5 text-sm text-oxide"><AlertCircle size={14} aria-hidden />{err.form}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-teal" disabled={busy}>{busy ? "Creating…" : "Create voucher"}</button></div>
      </form>
    </div>
  );
}
