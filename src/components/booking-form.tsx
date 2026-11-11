"use client";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Clock, Lock } from "lucide-react";
import { Req, useReady } from "./auth-forms";
import { useAuth } from "./auth-state";
import { Price } from "./price";
import { SLOTS, TOPICS, bookableDates, dateLabel } from "@/lib/booking";
import { rupiah } from "@/lib/format";
import { useLocale, useLp, useT } from "@/i18n/client";

type FieldKey = "name" | "email" | "phone" | "organisation" | "topic" | "date" | "time";
type Fields = Partial<Record<FieldKey, string[]>>;

const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay(); // 1 = Mon .. 5 = Fri

function Field({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{t(label)}{!optional && <Req />}</label>
      {children}
      {error && <p id={`${id}-err`} className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{t(error)}</p>}
    </div>
  );
}

/** One-screen paid booking: pick a free slot, fill in the details, pay with Midtrans. */
export function BookingForm({ feeUsd, fx, ready, snapJs, clientKey }: { feeUsd: number | null; fx: number | null; ready: boolean; snapJs: string; clientKey: string }) {
  const t = useT();
  const L = useLp();
  const locale = useLocale();
  const router = useRouter();
  const { ready: authReady, signedIn } = useAuth();
  const dl = (d: string, opts?: Intl.DateTimeFormatOptions) =>
    opts ? new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)) : dateLabel(d, locale === "ja" ? "ja-JP" : "en-GB");

  const dates = useMemo(() => bookableDates(), []);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const { ready: formOk, check, ref } = useReady(() => Boolean(date && time));

  const loadTaken = () =>
    fetch("/api/bookings/slots", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { taken?: string[] }) => setTaken(new Set(d.taken ?? [])))
      .catch(() => {});
  useEffect(() => { loadTaken(); }, []);

  const free = (d: string) => SLOTS.filter((s) => !taken.has(`${d} ${s}`)).length;
  // default to the first day that still has a free slot
  useEffect(() => {
    if (!date && dates.length) setDate(dates.find((d) => free(d) > 0) ?? dates[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taken, dates]);
  useEffect(() => { if (ref.current) check({ currentTarget: ref.current } as React.SyntheticEvent<HTMLFormElement>); /* re-gate on slot change */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time]);

  // Mon-Fri calendar grid: pad the first week so columns line up with weekdays
  const cells = useMemo(() => {
    if (!dates.length) return [] as (string | null)[];
    return [...Array(weekday(dates[0]) - 1).fill(null), ...dates] as (string | null)[];
  }, [dates]);

  const canPay = ready && feeUsd !== null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formOk || !canPay) return;
    setBusy(true); setErr(""); setFields({});
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), date, time, locale };
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.login) return router.push(L(`/login?next=${encodeURIComponent(L("/consulting"))}`));
        if (data.pendingId) return router.push(L(`/consulting/booking/${data.pendingId}`));
        setErr(t(data.error ?? "Could not send the request."));
        setFields(data.fields ?? {});
        if (data.taken) { setTime(""); loadTaken(); }
        return;
      }
      const go = () => router.push(L(`/consulting/booking/${data.id}`));
      if (window.snap) window.snap.pay(data.token, { onSuccess: go, onPending: go, onClose: go, onError: () => setErr(t("Payment failed. You can try again.")) });
      else window.location.href = data.redirectUrl;
    } catch {
      setErr(t("Network error. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const fe = (k: FieldKey) => fields[k]?.[0];
  const chip = "rounded-lg border px-2 py-2 text-center text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal";

  return (
    <>
      {canPay && <Script src={snapJs} data-client-key={clientKey} strategy="afterInteractive" />}
      <form ref={ref} onSubmit={submit} onInput={check} onChange={check} noValidate className="grid flex-1 items-start gap-4 md:gap-6 xl:grid-cols-[1fr_1fr_320px]">
        {/* 1. slot */}
        <fieldset className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
          <legend className="sr-only">{t("Date")}</legend>
          <p className="flex items-center gap-2 font-semibold"><CalendarDays size={18} className="text-teal" aria-hidden />{t("Choose a date")}</p>
          <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[11px] uppercase text-muted" aria-hidden>
            {["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].map((d) => <span key={d}>{dl(d, { weekday: "short" })}</span>)}
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t("Date")}>
            {cells.map((d, i) =>
              d === null ? <span key={`pad-${i}`} /> : (
                <label key={d} className={`${chip} cursor-pointer ${date === d ? "border-teal bg-teal text-white" : free(d) === 0 ? "cursor-not-allowed border-line text-neutral-400 line-through" : "border-line hover:border-teal"}`}>
                  <input type="radio" name="date-pick" value={d} className="sr-only" checked={date === d} disabled={free(d) === 0} onChange={() => { setDate(d); setTime(""); }} aria-label={dl(d)} />
                  <span className="block font-mono font-medium">{dl(d, { day: "numeric" })}</span>
                  <span className={`block text-[10px] ${date === d ? "text-white/80" : "text-muted"}`}>{dl(d, { month: "short" })}</span>
                </label>
              ),
            )}
          </div>
          {fe("date") && <p className="text-[13px] text-oxide">{t(fe("date")!)}</p>}
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="flex items-center gap-2 font-semibold"><Clock size={18} className="text-teal" aria-hidden />{t("Time (JST)")}<Req /></p>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t("Time (JST)")}>
              {SLOTS.map((s) => {
                const off = !date || taken.has(`${date} ${s}`);
                return (
                  <label key={s} className={`${chip} font-mono ${off ? "cursor-not-allowed border-line text-neutral-400 line-through" : "cursor-pointer"} ${time === s ? "border-teal bg-teal text-white" : off ? "" : "border-line hover:border-teal"}`}>
                    <input type="radio" name="time-pick" value={s} className="sr-only" disabled={off} checked={time === s} onChange={() => setTime(s)} />
                    {s}
                    {off && date && <span className="sr-only"> {t("(taken)")}</span>}
                  </label>
                );
              })}
            </div>
            {fe("time") && <p className="text-[13px] text-oxide">{t(fe("time")!)}</p>}
            <p className="text-xs text-muted">{t("Taken times are crossed out.")}</p>
          </div>
        </fieldset>

        {/* 2. details */}
        <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5">
          <legend className="sr-only">{t("Your details")}</legend>
          <p className="font-semibold">{t("Your details")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="name" label="Full name" error={fe("name")}><input id="name" name="name" className="input" autoComplete="name" required minLength={2} maxLength={80} placeholder={t("Your name")} /></Field>
            <Field id="email" label="Email" error={fe("email")}><input id="email" name="email" type="email" className="input" autoComplete="email" required maxLength={120} placeholder={t("you@team.com")} /></Field>
            <Field id="phone" label="Phone" error={fe("phone")}><input id="phone" name="phone" type="tel" className="input" autoComplete="tel" required pattern="\+?[0-9 \(\)\-]{6,20}" placeholder="+81" /></Field>
            <Field id="organisation" label="Team or company" error={fe("organisation")}><input id="organisation" name="organisation" className="input" autoComplete="organization" required minLength={2} maxLength={120} placeholder={t("Organisation")} /></Field>
          </div>
          <Field id="topic" label="Topic" error={fe("topic")}>
            <select id="topic" name="topic" className="input" required defaultValue="">
              <option value="" disabled>{t("Choose a topic")}</option>
              {TOPICS.map((o) => <option key={o.id} value={o.id}>{t(o.label)}</option>)}
            </select>
          </Field>
          <Field id="message" label="What would you like to discuss?" optional>
            <textarea id="message" name="message" rows={3} maxLength={1000} className="input min-h-20 resize-y" placeholder={t("Optional. Your car, the problem, and your deadline.")} />
          </Field>
          {/* honeypot */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        </fieldset>

        {/* 3. summary + pay */}
        <aside aria-labelledby="bk-sum" className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-white p-5 xl:sticky xl:top-20">
          <h2 id="bk-sum" className="font-semibold">{t("Summary")}</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Session")}</dt><dd className="text-right">{t("30-minute video call")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Date")}</dt><dd className="text-right">{date ? dl(date) : "-"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Time")}</dt><dd className="font-mono">{time ? `${time} JST` : "-"}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="font-semibold">{t("Fee")}</dt><dd className="font-medium">{feeUsd ? <Price usd={feeUsd} /> : t("Not set")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Charged in IDR")}</dt><dd className="font-mono">{feeUsd && fx ? `≈ ${rupiah(Math.ceil(feeUsd * fx))}` : t("Rate not set")}</dd></div>
          </dl>
          {!canPay && <p role="status" className="rounded-lg bg-ochre-tint p-3 text-[13px]">{t("Paid booking is not configured yet (CONSULT_FEE_USD, FX_USD_IDR or Midtrans keys missing).")}</p>}
          {err && <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{err}</p>}
          {authReady && !signedIn ? (
            <Link href={L(`/login?next=${encodeURIComponent(L("/consulting"))}`)} className="btn btn-ochre btn-lg w-full">{t("Log in to book")}</Link>
          ) : (
            <button type="submit" className="btn btn-ochre btn-lg w-full" disabled={!formOk || !canPay || busy || !authReady}>{t(busy ? "Opening Midtrans…" : "Pay and book")}</button>
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted"><Lock size={14} className="mt-0.5 shrink-0 text-teal" aria-hidden />{t("The slot is held for 15 minutes while you pay. Unpaid bookings are released automatically.")}</p>
        </aside>
      </form>
    </>
  );
}
