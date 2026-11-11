"use client";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { useCartLines } from "./cart-view";
import type { Product } from "@/lib/data";
import { rupiah } from "@/lib/format";
import { usd } from "@/lib/money";
import { Price } from "./price";
import type { SavedAddress } from "@/lib/orders";
import { useLocale, useLp, useT } from "@/i18n/client";

declare global {
  interface Window {
    snap?: { pay: (token: string, cb: { onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void }) => void };
  }
}

type Fields = "email" | "name" | "phone" | "address" | "city" | "postal" | "country";
const RULES: Record<Fields, [RegExp, string]> = {
  email: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email."],
  name: [/^.{2,80}$/, "Enter your full name."],
  phone: [/^\+?[0-9 ()-]{6,20}$/, "Enter a valid phone number."],
  address: [/^.{5,200}$/, "Enter the street address."],
  city: [/^.{2,80}$/, "Enter a city."],
  postal: [/^[0-9A-Za-z -]{3,10}$/, "Enter a valid postal code."],
  country: [/^.{2,56}$/, "Choose a country."],
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
  products, email, saved, fx, shippingUsd, ready, snapJs, clientKey,
}: { products: Product[]; email: string; saved?: SavedAddress | null; fx: number | null; shippingUsd: number; ready: boolean; snapJs: string; clientKey: string }) {
  const { cart, lines, subtotal } = useCartLines(products);
  const router = useRouter();
  const t = useT();
  const L = useLp();
  const locale = useLocale();
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const total = subtotal + (lines.length ? shippingUsd : 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const contact = Object.fromEntries((Object.keys(RULES) as Fields[]).map((k) => [k, String(fd.get(k) ?? "").trim()])) as Record<Fields, string>;
    const errs: Partial<Record<Fields, string>> = {};
    for (const k of Object.keys(RULES) as Fields[]) if (!RULES[k][0].test(contact[k])) errs[k] = RULES[k][1];
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ id: l.id, qty: l.qty })), contact, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(t(data.error ?? "Something went wrong."));
        if (data.fields) setErrors(Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k, (v as string[])[0]])));
        return;
      }
      const done = () => { cart.clear(); router.push(L(`/receipt/${data.orderId}`)); };
      if (window.snap) window.snap.pay(data.token, { onSuccess: done, onPending: done, onError: () => setFormError(t("Payment failed. You can try again.")), onClose: () => setFormError(t("Payment window closed. Your order is saved as pending.")) });
      else window.location.href = data.redirectUrl;
    } catch {
      setFormError(t("Network error. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  }

  if (cart.ready && lines.length === 0)
    return <div className="container-x pb-20 text-muted">{t("Your cart is empty.")}</div>;

  return (
    <>
      {ready && <Script src={snapJs} data-client-key={clientKey} strategy="afterInteractive" />}
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
            {saved && <p className="-mt-2 text-[13px] text-muted">{t("Filled in from your last order. Change anything that is different.")}</p>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="name" label={t("Full name")} autoComplete="name" defaultValue={saved?.buyer_name} error={errors.name} />
              <Field id="phone" label={t("Phone")} type="tel" autoComplete="tel" placeholder="+81" defaultValue={saved?.phone} error={errors.phone} />
            </div>
            <Field id="address" label={t("Address")} autoComplete="street-address" placeholder={t("Street, building, unit")} defaultValue={saved?.address} error={errors.address} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="city" label={t("City")} autoComplete="address-level2" defaultValue={saved?.city} error={errors.city} />
              <Field id="postal" label={t("Postal code")} autoComplete="postal-code" defaultValue={saved?.postal_code} error={errors.postal} />
            </div>
            <Field id="country" label={t("Country")} autoComplete="country-name" defaultValue={saved?.country ?? t("Japan")} error={errors.country} />
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
                <span className="font-mono">{usd(l.product.priceUsd * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-3 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("Subtotal")}</dt><dd className="font-mono">{usd(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("Shipping")}</dt><dd className="font-mono">{shippingUsd ? usd(shippingUsd) : t("Included")}</dd></div>
            <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">{t("Total")}</dt><dd className="font-medium"><Price usd={total} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("Charged in IDR")}</dt><dd className="font-mono">{fx ? `≈ ${rupiah(Math.ceil(total * fx))}` : t("Rate not set")}</dd></div>
          </dl>
          <p className="text-xs text-muted">{fx ? t("Rate {rate} IDR per USD, locked when you press Pay.", { rate: fx.toLocaleString("id-ID") }) : t("The USD/IDR rate is configured by Finance.")}</p>
          {formError && <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{formError}</p>}
          <button type="submit" className="btn btn-ochre btn-lg w-full" disabled={!ready || busy || lines.length === 0}>
            {t(busy ? "Opening Midtrans…" : "Pay with Midtrans")}
          </button>
          <p className="flex items-center gap-1.5 text-xs text-muted"><Lock size={14} className="text-teal" aria-hidden />{t("Payment is processed by Midtrans. We never see your card.")}</p>
        </aside>
      </form>
    </>
  );
}
