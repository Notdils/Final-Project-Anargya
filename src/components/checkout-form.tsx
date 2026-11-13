"use client";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { useCartLines } from "./cart-view";
import type { Product } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { Price } from "./price";
import { useCurrency } from "./currency";
import { usd } from "@/lib/money";
import type { SavedAddress } from "@/lib/orders";
import { useLeaveGuard } from "@/components/leave-guard";
import { PaymentResult } from "@/components/payment-result";
import { JP_REGIONS, countryName, destinationCodes, quote, regionName, type ShippingData } from "@/lib/shipping";
import { useLocale, useLp, useT } from "@/i18n/client";

declare global {
  interface Window {
    snap?: { pay: (token: string, cb: { onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void }) => void };
  }
}

type Fields = "email" | "name" | "phone" | "address" | "city" | "postal" | "country" | "region" | "note";
const RULES: Record<Exclude<Fields, "country" | "region" | "note">, [RegExp, string]> = {
  email: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email."],
  name: [/^.{2,80}$/, "Enter your full name."],
  phone: [/^\+?[0-9 ()-]{6,20}$/, "Enter a valid phone number."],
  address: [/^.{5,200}$/, "Enter the street address."],
  city: [/^.{2,80}$/, "Enter a city."],
  postal: [/^[0-9A-Za-z -]{3,10}$/, "Enter a valid postal code."],
};

function Field({ id, label, error, ...rest }: { id: Fields; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} name={id} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      {error && (
        <p id={`${id}-err`} className="flex items-center gap-1.5 text-[13px] text-oxide">
          <AlertCircle size={14} aria-hidden /> {t(error)}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({
  products, email, saved, fx, shipping, ready, snapJs, clientKey,
}: { products: Product[]; email: string; saved?: SavedAddress | null; fx: number | null; shipping: ShippingData; ready: boolean; snapJs: string; clientKey: string }) {
  const { cart, lines, subtotal } = useCartLines(products);
  const router = useRouter();
  const t = useT();
  const L = useLp();
  const locale = useLocale();
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false); // opt-in, never saved silently
  const idemKey = useRef<string | null>(null);
  const codes = destinationCodes(shipping);
  // prefill from the last order: its destination code, else match the stored country name, else Japan
  const savedCode = saved?.ship_country ?? codes.find((c) => countryName(c, "en") === saved?.country || countryName(c, "ja") === saved?.country) ?? "JP";
  const [country, setCountry] = useState(codes.includes(savedCode) ? savedCode : "JP");
  const [region, setRegion] = useState(saved?.ship_region ?? "");
  const q = quote(shipping, country, region, lines.map((l) => ({ id: l.id, qty: l.qty })));
  const shipUsd = q.ok ? q.shippingUsd : null;
  const total = subtotal + (lines.length && shipUsd !== null ? shipUsd : 0);
  const { ccy } = useCurrency();
  const [result, setResult] = useState<{ state: "paid" | "pending"; orderId: string } | null>(null);
  // ask before leaving while there is something in the cart and no payment has started
  const [paying, setPaying] = useState(false); // Midtrans window open: it may redirect (3DS, e-wallets), so do not block leaving
  const guard = useLeaveGuard(cart.ready && lines.length > 0 && !result && !paying);
  // code-point order, not localeCompare: same result on server and browser (no hydration mismatch)
  const sorted = useMemo(() => ["JP", ...codes.filter((c) => c !== "JP").sort((a, b) => (countryName(a, locale) < countryName(b, locale) ? -1 : 1))], [codes, locale]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const keys = Object.keys(RULES) as (keyof typeof RULES)[];
    const contact: Record<string, string | null> = { ...Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "").trim()])), country, region: country === "JP" ? region : null };
    const errs: Partial<Record<Fields, string>> = {};
    for (const k of keys) if (!RULES[k][0].test(String(contact[k]))) errs[k] = RULES[k][1];
    const note = String(fd.get("note") ?? "").trim();
    contact.note = note || null;
    if (note.length > 300) errs.note = "Keep it under 300 characters.";
    else if (/http:\/\//i.test(note)) errs.note = "Use a link that starts with https://.";
    if (!q.ok) errs[q.field] = q.error;
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      // one key per Pay press; reused only if that request never got an answer (so a retry cannot double-order)
      idemKey.current ??= crypto.randomUUID();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idemKey.current },
        body: JSON.stringify({ items: lines.map((l) => ({ id: l.id, qty: l.qty })), contact, locale, saveAddress }),
      });
      const data = await res.json();
      idemKey.current = null; // answered: the next press is a new attempt
      if (!res.ok) {
        setFormError(t(data.error ?? "Something went wrong."));
        if (data.fields) setErrors(Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k, (v as string[])[0]])));
        return;
      }
      guard.disable();
      const done = (state: "paid" | "pending") => () => { cart.clear(); setResult({ state, orderId: data.orderId }); };
      setPaying(true);
      if (window.snap) window.snap.pay(data.token, { onSuccess: done("paid"), onPending: done("pending"), onError: () => { setPaying(false); setFormError(t("Payment failed. You can try again.")); }, onClose: () => { setPaying(false); setFormError(t("Payment window closed. Your order is saved as pending.")); } });
      else window.location.href = data.redirectUrl;
    } catch {
      setFormError(t("Network error. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  }

  if (result) return <PaymentResult state={result.state} onView={() => router.push(L(`/receipt/${result.orderId}${result.state === "paid" ? "?paid=1" : ""}`))} />;

  if (cart.ready && lines.length === 0)
    return (
      <div className="container-x pb-20">
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="font-medium">{t("Your cart is empty.")}</p>
          <p className="mt-1 text-sm text-muted">{t("Add parts from the marketplace, then come back here to pay.")}</p>
          <Link href={L("/marketplace")} className="btn btn-teal mt-4">{t("Browse marketplace")}</Link>
        </div>
      </div>
    );

  return (
    <>
      {ready && <Script src={snapJs} data-client-key={clientKey} strategy="afterInteractive" />}
      {guard.dialog}
      <form onSubmit={submit} noValidate className="container-x grid gap-6 pb-12 md:pb-20 xl:grid-cols-[1fr_400px] xl:gap-12">
        <div className="flex flex-col gap-8">
          {!ready && (
            <p role="status" className="flex items-start gap-2 rounded-lg bg-ochre-tint p-4 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />
              {t("Payments are not configured yet (Supabase, Midtrans keys or FX_USD_IDR missing). The form is shown for review only.")}
            </p>
          )}
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 text-lg font-semibold">{t("Contact")}</legend>
            <Field id="email" label={t("Email")} type="email" autoComplete="email" defaultValue={email} error={errors.email} />
          </fieldset>
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 text-lg font-semibold">{t("Shipping address")}</legend>
            {saved && <p className="-mt-2 text-[13px] text-muted">{t("Filled in from your saved shipping address. Change anything that is different.")}</p>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="name" label={t("Full name")} autoComplete="name" defaultValue={saved?.buyer_name} error={errors.name} />
              <Field id="phone" label={t("Phone")} type="tel" autoComplete="tel" placeholder="+81" defaultValue={saved?.phone} error={errors.phone} />
            </div>
            <Field id="address" label={t("Address")} autoComplete="street-address" placeholder={t("Street, building, unit")} defaultValue={saved?.address} error={errors.address} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="city" label={t("City")} autoComplete="address-level2" defaultValue={saved?.city} error={errors.city} />
              <Field id="postal" label={t("Postal code")} autoComplete="postal-code" defaultValue={saved?.postal_code} error={errors.postal} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="country" className="text-sm font-medium">{t("Country")}</label>
                <select id="country" name="country" className="input" autoComplete="country" value={country} aria-invalid={Boolean(errors.country)} aria-describedby="country-hint"
                  onChange={(e) => { setCountry(e.target.value); setErrors((x) => ({ ...x, country: undefined })); }}>
                  {sorted.map((c) => <option key={c} value={c}>{countryName(c, locale, shipping.zones.find((z) => z.code === c)?.name)}</option>)}
                </select>
                {errors.country ? <p className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden /> {t(errors.country)}</p>
                  : <p id="country-hint" className="text-[13px] text-muted">{t("We ship within Asia by DHL Express. Shipping is charged per box and depends on the destination and the parts. In Japan, you pay the courier on delivery.")}</p>}
              </div>
              {country === "JP" && (
                <fieldset className="flex flex-col gap-2" aria-describedby="region-hint">
                  <legend className="mb-2 text-sm font-medium">{t("Region in Japan")}</legend>
                  {/* two options: a visible segmented choice instead of a dropdown */}
                  <div role="radiogroup" className="grid grid-cols-2 gap-2">
                    {JP_REGIONS.map((r) => (
                      <label key={r.code} className={`flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal ${region === r.code ? "border-teal bg-teal-tint text-teal" : errors.region ? "border-oxide" : "border-line hover:bg-surface"}`}>
                        <input type="radio" name="region" value={r.code} className="sr-only" checked={region === r.code}
                          onChange={() => { setRegion(r.code); setErrors((x) => ({ ...x, region: undefined })); }} />
                        {locale === "ja" ? r.ja : r.en}
                      </label>
                    ))}
                  </div>
                  {errors.region ? <p id="region-hint" className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden /> {t(errors.region)}</p>
                    : <p id="region-hint" className="text-[13px] text-muted">{JP_REGIONS.map((r) => `${locale === "ja" ? r.ja : r.en}: ${t(r.hint)}`).join(" · ")}</p>}
                </fieldset>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="note" className="text-sm font-medium">{t("Address details")} <span className="font-normal text-muted">({t("optional")})</span></label>
              <textarea id="note" name="note" rows={3} maxLength={300} className="input h-auto min-h-24 resize-y py-3" defaultValue={saved?.address_note ?? ""}
                placeholder={t("e.g. Blue gate next to the convenience store. https://maps.app.goo.gl/…")} aria-invalid={Boolean(errors.note)} aria-describedby="note-hint"
                onChange={() => errors.note && setErrors((x) => ({ ...x, note: undefined }))} />
              {errors.note ? <p id="note-hint" className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden /> {t(errors.note)}</p>
                : <p id="note-hint" className="text-[13px] text-muted">{t("Landmarks, gate or floor, delivery notes. You can paste a Google Maps link.")}</p>}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#006F66]" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t(saved ? "Update my saved shipping address" : "Save this as your shipping address?")}</span>
                <span className="text-[13px] text-muted">{t(saved ? "Replace the saved one with these details for future orders." : "This will be used for future orders.")}</span>
              </span>
            </label>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-lg font-semibold">{t("Payment")}</legend>
            <label className="flex items-center gap-3 rounded-lg border-[1.5px] border-teal bg-teal-tint p-4">
              <input type="radio" name="method" defaultChecked className="h-4 w-4 accent-teal" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">Midtrans</span>
                <span className="text-[13px] text-muted">{t("GoPay · QRIS · Bank transfer · Cards. Opens Midtrans Snap.")}</span>
              </span>
            </label>
          </fieldset>
        </div>

        <aside aria-labelledby="sum" className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          <h2 id="sum" className="text-lg font-semibold">{t("Order summary")}</h2>
          <ul className="flex flex-col gap-3">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 text-sm">
                <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-white" aria-hidden>{l.product.image && <img src={l.product.image} alt="" className="h-full w-full object-contain" />}</span>
                <span className="flex-1">{l.product.name} × {l.qty}</span>
                <Price usd={l.product.priceUsd * l.qty} />
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("Subtotal")}</dt><dd><Price usd={subtotal} /></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Shipping")}{q.ok && <span className="block text-xs">{countryName(q.country, locale)}{q.region ? ` · ${regionName(q.region, locale)}` : ""}</span>}</dt>
              <dd className="text-right font-mono">{shipUsd === null ? <span className="font-sans text-muted">{t(country === "JP" ? "Choose East or West" : "Choose a country")}</span> : q.ok && q.customerPaid ? <span className="font-sans">{t("Paid by you on delivery")}</span> : shipUsd ? <Price usd={shipUsd} /> : t("Included")}
                {q.ok && q.minDays !== null && q.maxDays !== null && <span className="block font-sans text-xs text-muted">{t("{min}–{max} days", { min: q.minDays, max: q.maxDays })}</span>}
                {q.ok && !q.customerPaid && <span className="block font-sans text-xs text-muted">{t("DHL Express, per box")}</span>}</dd></div>
            <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">{t("Total")}</dt><dd className="text-right font-medium"><Price usd={total} />{ccy !== "USD" && <span className="block font-mono text-xs font-normal text-muted">{usd(total)} USD</span>}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("Charged in IDR")}</dt><dd className="font-mono">{fx ? `≈ ${rupiah(Math.ceil(total * fx))}` : t("Rate not set")}</dd></div>
          </dl>
          <p className="text-xs text-muted">{t("Prices are set in USD. Midtrans charges in rupiah (IDR) only.")} {fx ? t("Rate {rate} IDR per USD, locked when you press Pay.", { rate: fx.toLocaleString(locale === "ja" ? "ja-JP" : "en-US") }) : t("The USD/IDR rate is configured by Finance.")}</p>
          {formError && <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{formError}</p>}
          <button type="submit" className="btn btn-pay btn-lg w-full" disabled={!ready || busy || lines.length === 0}>
            {t(busy ? "Opening Midtrans…" : "Pay with Midtrans")}
          </button>
          <p className="flex items-center gap-1.5 text-xs text-muted"><Lock size={14} className="text-teal" aria-hidden />{t("Payment is processed by Midtrans. We never see your card.")}</p>
        </aside>
      </form>
    </>
  );
}
