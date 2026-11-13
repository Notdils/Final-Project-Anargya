"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, MapPin, Pencil, Plus } from "lucide-react";
import { useLocale, useT } from "@/i18n/client";
import { countryName, destinationCodes, destinationLabel, type ShippingData } from "@/lib/shipping";
import type { SavedAddress } from "@/lib/orders";
import { RemoveAddress } from "@/components/remove-address";

type Err = Partial<Record<"name" | "phone" | "address" | "city" | "postal" | "country" | "note" | "form", string>>;

/** Account → saved shipping address: view, add, edit or remove. Checkout fills in from it. */
export function AddressCard({ saved, shipping }: { saved: SavedAddress | null; shipping: ShippingData }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<Err>({});
  const codes = destinationCodes(shipping);
  const sorted = useMemo(() => ["JP", ...codes.filter((c) => c !== "JP").sort((a, b) => (countryName(a, locale) < countryName(b, locale) ? -1 : 1))], [codes, locale]);
  const initial = saved?.ship_country && codes.includes(saved.ship_country) ? saved.ship_country : "JP";
  const [country, setCountry] = useState(initial);

  function start() {
    setCountry(initial);
    setErr({});
    setDone(false);
    setEditing(true);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"), phone: fd.get("phone"), address: fd.get("address"), city: fd.get("city"), postal: fd.get("postal"),
      country, note: fd.get("note") || null,
    };
    setBusy(true);
    setErr({});
    const res = await fetch("/api/account/address", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      const f = (data?.fields ?? {}) as Record<string, string[] | undefined>;
      setErr({ name: f.name?.[0], phone: f.phone?.[0], address: f.address?.[0], city: f.city?.[0], postal: f.postal?.[0], country: f.country?.[0], note: f.note?.[0], form: data?.error ?? "Could not save. Try again." });
      return;
    }
    setEditing(false);
    setDone(true);
    router.refresh();
  }

  const msg = (m?: string) => m && <p className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden /> {t(m)}</p>;
  const field = (id: "name" | "phone" | "address" | "city" | "postal", label: string, value: string | undefined, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={`ad-${id}`} className="text-sm font-medium">{t(label)}</label>
      <input id={`ad-${id}`} name={id} className="input" defaultValue={value ?? ""} aria-invalid={Boolean(err[id])} {...extra} />
      {msg(err[id])}
    </div>
  );

  return (
    <section aria-labelledby="addr-title" className="flex flex-col gap-3 rounded-xl border border-line p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="addr-title" className="flex items-center gap-2 font-semibold"><MapPin size={18} className="text-teal" aria-hidden />{t("Shipping address")}</h2>
        {!editing && (
          <button type="button" className="btn btn-outline min-h-8 px-3 py-1 text-sm" onClick={start}>
            {saved ? <Pencil size={14} aria-hidden /> : <Plus size={14} aria-hidden />}{t(saved ? "Edit" : "Add")}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-3" noValidate>
          {field("name", "Full name", saved?.buyer_name, { autoComplete: "name", maxLength: 80 })}
          {field("phone", "Phone", saved?.phone, { autoComplete: "tel", inputMode: "tel", maxLength: 20, placeholder: "+81" })}
          {field("address", "Address", saved?.address, { autoComplete: "street-address", maxLength: 200, placeholder: t("Street, building, unit") })}
          {field("city", "City", saved?.city, { autoComplete: "address-level2", maxLength: 80 })}
          {field("postal", "Postal code", saved?.postal_code, { autoComplete: "postal-code", maxLength: 10 })}
          <div className="flex flex-col gap-2">
            <label htmlFor="ad-country" className="text-sm font-medium">{t("Country")}</label>
            <select id="ad-country" className="input" autoComplete="country" value={country} aria-invalid={Boolean(err.country)}
              onChange={(e) => { setCountry(e.target.value); setErr((x) => ({ ...x, country: undefined })); }}>
              {sorted.map((c) => <option key={c} value={c}>{countryName(c, locale, shipping.zones.find((z) => z.code === c)?.name)}</option>)}
            </select>
            {msg(err.country)}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ad-note" className="text-sm font-medium">{t("Address details")} <span className="font-normal text-muted">({t("optional")})</span></label>
            <textarea id="ad-note" name="note" rows={3} maxLength={300} className="input h-auto min-h-20 resize-y py-3" defaultValue={saved?.address_note ?? ""} aria-invalid={Boolean(err.note)} />
            {msg(err.note)}
          </div>
          {msg(err.form)}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-teal" disabled={busy}>{t(busy ? "Saving…" : "Save")}</button>
            <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setErr({}); }}>{t("Cancel")}</button>
          </div>
        </form>
      ) : saved ? (
        <>
          {done && <p role="status" className="flex items-center gap-1.5 text-sm text-teal"><Check size={14} aria-hidden />{t("Address saved.")}</p>}
          <address className="text-sm not-italic leading-6">
            {saved.buyer_name}<br />{saved.address}<br />{saved.city} {saved.postal_code}<br />{destinationLabel(saved.country, null, locale, saved.ship_country)}<br />
            <span className="text-muted">{saved.phone}</span>
            {saved.address_note && <><br /><span className="text-muted">{saved.address_note}</span></>}
          </address>
          <p className="text-xs text-muted">{t("Used to fill in your next order. You can still change it at checkout.")}</p>
          <RemoveAddress />
        </>
      ) : (
        <p className="text-sm text-muted">{t("No saved address yet. Add one here, or tick “Save this as your shipping address” at checkout.")}</p>
      )}
    </section>
  );
}
