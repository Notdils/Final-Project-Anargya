"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Box, Check, Info, Minus, Plus, Search, Upload, X } from "lucide-react";
import { CATEGORIES, categoryLabel, type Category } from "@/lib/data";
import { usd, yenFromUsd, yen } from "@/lib/money";
import type { AdminProduct } from "@/lib/admin-products";

const PartScene = dynamic(() => import("@/components/part-scene"), { ssr: false });
const UNITS = ["set", "kit", "unit", "pair"];
const LOW = 3;

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-teal" : "bg-line"}`}>
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`} />
    </button>
  );
}

function StockBadge({ n }: { n: number }) {
  if (n <= 0) return <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-muted">Out</span>;
  if (n <= LOW) return <span className="inline-flex items-center gap-1 rounded bg-oxide-tint px-1.5 py-0.5 text-xs font-medium text-oxide"><AlertTriangle size={12} aria-hidden />Low</span>;
  return null;
}

const Thumb = ({ src }: { src: string | null }) => (
  <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2" aria-hidden>
    {src && <Image src={src} alt="" fill sizes="48px" className="object-contain p-0.5" />}
  </span>
);

type Draft = Omit<AdminProduct, "price_usd" | "stock"> & { price_usd: string; stock: number };
const toDraft = (p: AdminProduct): Draft => ({ ...p, price_usd: String(p.price_usd) });
const blank = (): Draft => ({ id: "", slug: "", code: "", name: "", category: "aero", price_usd: "", unit: "unit", stock: 0, active: false, featured: false, image_url: null, model_url: null, lead_time: null, material: null, weight: null, dimensions: null, fits: null, finish: null, description: null, overview: null });

export function ProductsManager({ products, canWrite }: { products: AdminProduct[]; canWrite: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(products);
  useEffect(() => setRows(products), [products]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | Category>("all");
  const [status, setStatus] = useState<"all" | "active" | "hidden">("all");
  const [stock, setStock] = useState<"all" | "low" | "out">("all");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toast, setToast] = useState("");

  const shown = useMemo(() => rows.filter((p) => {
    const t = q.trim().toLowerCase();
    return (!t || p.name.toLowerCase().includes(t) || p.code.toLowerCase().includes(t)) && (cat === "all" || p.category === cat) &&
      (status === "all" || (status === "active" ? p.active : !p.active)) && (stock === "all" || (stock === "out" ? p.stock <= 0 : p.stock > 0 && p.stock <= LOW));
  }), [rows, q, cat, status, stock]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  async function quick(p: AdminProduct, patch: Partial<Pick<AdminProduct, "active" | "featured">>) {
    setRows((r) => r.map((x) => (x.id === p.id ? { ...x, ...patch } : x))); // optimistic
    const res = await fetch(`/api/admin/products/${p.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
    if (!res?.ok) { setRows((r) => r.map((x) => (x.id === p.id ? p : x))); flash("Could not save. Try again."); }
    else { flash("Saved. Live on the marketplace."); router.refresh(); }
  }

  const sel = "input w-auto pr-8";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Products</h1>
          <p className="text-sm text-muted">{rows.length} parts. Changes go live on the marketplace right away.</p>
        </div>
        {canWrite && <button type="button" className="btn btn-outline w-fit" onClick={() => { setIsNew(true); setEdit(blank()); }}><Plus size={16} aria-hidden />New product</button>}
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <label><span className="sr-only">Category</span><select className={sel} value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}><option value="all">Category: All</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label><span className="sr-only">Status</span><select className={sel} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">Status: All</option><option value="active">Active</option><option value="hidden">Hidden</option></select></label>
          <label><span className="sr-only">Stock</span><select className={sel} value={stock} onChange={(e) => setStock(e.target.value as typeof stock)}><option value="all">Stock: All</option><option value="low">Low</option><option value="out">Out</option></select></label>
        </div>
      </div>

      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-line md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr className="eyebrow text-left text-muted">
              <th className="px-4 py-3 font-medium">Part</th><th className="px-2 py-3 font-medium">Category</th><th className="px-2 py-3 font-medium">Price</th>
              <th className="px-2 py-3 font-medium">Stock</th><th className="px-2 py-3 font-medium">3D</th><th className="px-2 py-3 font-medium">Featured</th><th className="px-2 py-3 font-medium">Active</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const y = yenFromUsd(p.price_usd);
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3"><span className="flex items-center gap-3"><Thumb src={p.image_url} /><span className="flex flex-col"><span className="font-medium">{p.name}</span><span className="font-mono text-xs text-muted">{p.code}</span></span></span></td>
                  <td className="px-2 py-3 text-[#404040]">{categoryLabel(p.category)}</td>
                  <td className="px-2 py-3"><span className="flex flex-col font-mono"><span className="font-medium">{usd(p.price_usd)}</span>{y !== null && <span className="text-xs text-muted">≈ {yen(y)}</span>}</span></td>
                  <td className="px-2 py-3"><span className="flex items-center gap-2"><span className="font-mono font-medium">{p.stock}</span><StockBadge n={p.stock} /></span></td>
                  <td className="px-2 py-3">{p.model_url ? <Check size={16} className="text-teal" aria-label="Has 3D model" /> : <span className="text-muted" aria-label="No 3D model">–</span>}</td>
                  <td className="px-2 py-3"><Switch on={p.featured} disabled={!canWrite} label={`Featured: ${p.name}`} onChange={(v) => quick(p, { featured: v })} /></td>
                  <td className="px-2 py-3"><Switch on={p.active} disabled={!canWrite} label={`Active: ${p.name}`} onChange={(v) => quick(p, { active: v })} /></td>
                  <td className="px-4 py-3 text-right"><button type="button" className="font-medium text-teal hover:underline" onClick={() => { setIsNew(false); setEdit(toDraft(p)); }}>{canWrite ? "Edit" : "View"}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="border-t border-line p-8 text-center text-sm text-muted">No products match these filters.</p>}
      </div>

      {/* mobile cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {shown.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <button type="button" className="flex gap-3 text-left" onClick={() => { setIsNew(false); setEdit(toDraft(p)); }}>
              <Thumb src={p.image_url} />
              <span className="flex min-w-0 flex-col"><span className="font-medium">{p.name}</span><span className="font-mono text-xs text-muted">{p.code} · {usd(p.price_usd)}</span></span>
            </button>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-1.5"><span className="text-xs text-muted">Stock</span><span className="font-mono font-medium">{p.stock}</span><StockBadge n={p.stock} /></span>
              <span className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">Featured<Switch on={p.featured} disabled={!canWrite} label={`Featured: ${p.name}`} onChange={(v) => quick(p, { featured: v })} /></span>
                <span className="flex items-center gap-1.5">Active<Switch on={p.active} disabled={!canWrite} label={`Active: ${p.name}`} onChange={(v) => quick(p, { active: v })} /></span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">Featured = shown in the coverflow. Active off = hidden from the marketplace (existing orders keep working). Stock here is a manual correction; paid orders still lower stock automatically.</p>
      {toast && <p role="status" className="fixed bottom-5 right-5 z-[1300] rounded-lg bg-ink px-4 py-2 text-sm text-white">{toast}</p>}
      {edit && <EditSheet draft={edit} isNew={isNew} canWrite={canWrite} onClose={() => setEdit(null)} onSaved={(m) => { setEdit(null); flash(m); router.refresh(); }} />}
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function EditSheet({ draft, isNew, canWrite, onClose, onSaved }: { draft: Draft; isNew: boolean; canWrite: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<"" | "image" | "model">("");
  const ref = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const price = Number(d.price_usd);
  const y = Number.isFinite(price) && price > 0 ? yenFromUsd(price) : null;

  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  async function save() {
    setBusy(true); setErr(""); setFields({});
    const body = isNew
      ? { name: d.name, code: d.code, category: d.category, priceUsd: price, unit: d.unit, stock: d.stock }
      : { name: d.name, category: d.category, priceUsd: price, unit: d.unit, stock: d.stock, active: d.active, featured: d.featured,
          leadTime: d.lead_time ?? "", material: d.material ?? "", weight: d.weight ?? "", dimensions: d.dimensions ?? "", fits: d.fits ?? "", finish: d.finish ?? "", description: d.description ?? "", overview: d.overview ?? d.description ?? "" };
    const res = await fetch(isNew ? "/api/admin/products" : `/api/admin/products/${d.id}`, { method: isNew ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setErr(data?.error ?? "Network error. Try again.");
      setFields(Object.fromEntries(Object.entries(data?.fields ?? {}).map(([k, v]) => [k, (v as string[])[0]])));
      return;
    }
    onSaved(isNew ? "Product created (hidden). Add media and turn it on when ready." : "Saved. Live on the marketplace.");
  }

  async function upload(kind: "image" | "model", file: File) {
    setUploading(kind); setErr("");
    const fd = new FormData(); fd.set("kind", kind); fd.set("file", file);
    const res = await fetch(`/api/admin/products/${d.id}/media`, { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setUploading("");
    if (!res?.ok) return setErr(data?.error ?? "Upload failed.");
    set(kind === "image" ? "image_url" : "model_url", data.url);
  }

  const fileName = (u: string | null) => (u ? decodeURIComponent(u.split("/").pop() ?? "") : "No file yet");
  const grp = "flex flex-col gap-3";
  const h = "eyebrow text-teal";
  return (
    <div className="fixed inset-0 z-[1200] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="edit-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="relative flex h-full w-full flex-col bg-white outline-none md:w-[480px]">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div><p className="font-mono text-xs text-muted">{isNew ? "New" : d.code}</p><h2 id="edit-title" className="text-lg font-semibold">{isNew ? "New product" : canWrite ? "Edit product" : d.name}</h2></div>
          <button type="button" className="btn btn-outline px-2" aria-label="Close" onClick={onClose}><X size={16} aria-hidden /></button>
        </div>
        <fieldset disabled={!canWrite || busy} className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <div className={grp}>
            <p className={h}>Basics</p>
            <Field label="Name" error={fields.name}><input className="input" value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={120} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code" error={fields.code} hint={isNew ? "e.g. AN-AERO-02" : "Fixed: used on receipts."}>
                <input className={`input font-mono ${isNew ? "" : "bg-surface-2 text-muted"}`} value={d.code} readOnly={!isNew} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={20} />
              </Field>
              <Field label="Category" error={fields.category}><select className="input" value={d.category} onChange={(e) => set("category", e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
            </div>
          </div>

          <div className={grp}>
            <p className={h}>Price and stock</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (USD)" error={fields.priceUsd} hint={y !== null ? `≈ ${yen(y)}` : undefined}>
                <span className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted">$</span><input className="input pl-7 font-mono" inputMode="decimal" value={d.price_usd} onChange={(e) => set("price_usd", e.target.value.replace(/[^\d.]/g, ""))} /></span>
              </Field>
              <Field label="Unit" error={fields.unit}><select className="input" value={d.unit} onChange={(e) => set("unit", e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium" id="stock-l">Stock</span>
                <div className="inline-flex w-fit items-center rounded-lg border border-line" role="group" aria-labelledby="stock-l">
                  <button type="button" className="p-2.5 disabled:opacity-40" aria-label="Decrease stock" disabled={d.stock <= 0} onClick={() => set("stock", Math.max(0, d.stock - 1))}><Minus size={16} aria-hidden /></button>
                  <input className="w-14 border-0 text-center font-mono font-medium outline-none" inputMode="numeric" aria-label="Stock" value={d.stock} onChange={(e) => set("stock", Math.min(100000, Number(e.target.value.replace(/\D/g, "")) || 0))} />
                  <button type="button" className="p-2.5" aria-label="Increase stock" onClick={() => set("stock", d.stock + 1)}><Plus size={16} aria-hidden /></button>
                </div>
                <span className="text-xs text-muted">Low-stock badge at {LOW} or fewer.</span>
              </div>
              {!isNew && <Field label="Lead time"><input className="input" value={d.lead_time ?? ""} placeholder="[PLACEHOLDER]" onChange={(e) => set("lead_time", e.target.value)} maxLength={80} /></Field>}
            </div>
            {!isNew && (
              <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
                {([["active", "Active", "Shown in the marketplace and can be bought."], ["featured", "Featured", "Shown in the coverflow on Home and Marketplace."]] as const).map(([k, l, s]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <span className="flex flex-col"><span className="font-medium">{l}</span><span className="text-xs text-muted">{s}</span></span>
                    <Switch on={d[k]} label={l} disabled={!canWrite} onChange={(v) => set(k, v)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isNew && (
            <div className={grp}>
              <p className={h}>Media</p>
              {(["image", "model"] as const).map((kind) => {
                const url = kind === "image" ? d.image_url : d.model_url;
                return (
                  <div key={kind} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{kind === "image" ? "Render image" : "3D model"}</span>
                    <div className="flex items-center gap-3 rounded-lg border border-line p-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-2 text-teal">{kind === "image" ? <Upload size={18} aria-hidden /> : <Box size={18} aria-hidden />}</span>
                      <span className="flex min-w-0 flex-1 flex-col"><span className="truncate font-mono text-[13px]">{fileName(url)}</span><span className="text-xs text-muted">{kind === "image" ? "WebP, PNG or JPEG · max 1 MB" : "GLB · max 10 MB · compress before uploading"}</span></span>
                      <label className={`btn btn-outline shrink-0 px-2.5 min-h-8 py-1.5 text-[13px] ${canWrite ? "cursor-pointer" : "pointer-events-none opacity-50"}`}>
                        <Upload size={14} aria-hidden />{uploading === kind ? "Uploading…" : url ? "Replace" : "Upload"}
                        <input type="file" className="sr-only" accept={kind === "image" ? "image/webp,image/png,image/jpeg" : ".glb,model/gltf-binary"} disabled={!canWrite || !!uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(kind, f); e.target.value = ""; }} />
                      </label>
                    </div>
                  </div>
                );
              })}
              {d.model_url && (
                <div className="relative h-48 overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_50%_45%,#2a2a2a_0%,#141414_55%,#000_100%)]">
                  <PartScene url={d.model_url} interactive rotating />
                  <span className="eyebrow pointer-events-none absolute bottom-2 left-3 text-neutral-400">3D preview</span>
                </div>
              )}
            </div>
          )}

          {!isNew && (
            <div className={grp}>
              <p className={h}>Specifications</p>
              <div className="grid grid-cols-2 gap-3">
                {([["material", "Material"], ["weight", "Weight"], ["dimensions", "Dimensions"], ["fits", "Fits"]] as const).map(([k, l]) => (
                  <Field key={k} label={l}><input className="input" value={d[k] ?? ""} placeholder="[PLACEHOLDER]" onChange={(e) => set(k, e.target.value)} maxLength={160} /></Field>
                ))}
              </div>
              <Field label="Finish"><input className="input" value={d.finish ?? ""} placeholder="[PLACEHOLDER]" onChange={(e) => set("finish", e.target.value)} maxLength={120} /></Field>
              <Field label="Description" hint="English. The Japanese version is added in src/i18n/ja.ts." error={fields.description}>
                <textarea className="input min-h-24 resize-y" rows={4} value={d.description ?? ""} maxLength={1000} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Overview" hint="Long text for the Overview tab. Empty uses the description." error={fields.overview}>
                <textarea className="input min-h-32 resize-y" rows={6} value={d.overview ?? ""} maxLength={2000} onChange={(e) => set("overview", e.target.value)} />
              </Field>
            </div>
          )}
          {err && <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{err}</p>}
        </fieldset>
        {canWrite && (
          <div className="flex flex-col gap-3 border-t border-line px-6 py-4">
            {!isNew && <p className="flex items-start gap-2 text-xs text-muted"><Info size={14} className="mt-0.5 shrink-0" aria-hidden />New prices apply to new orders only. Paid and pending orders keep the price they were created with.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-teal" disabled={busy || !d.name || !(price > 0) || (isNew && !d.code)} onClick={save}>{busy ? "Saving…" : isNew ? "Create product" : "Save changes"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
