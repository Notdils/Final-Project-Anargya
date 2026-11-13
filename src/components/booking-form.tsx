"use client";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Headset, Lock } from "lucide-react";
import { Req, useReady } from "./auth-forms";
import { useAuth } from "./auth-state";
import { Price } from "./price";
import { JST_TZ, SLOTS, TOPICS, ZONES, bookableDates, dateLabel, isBookableDate, slotInZone, utcOffset, zoneCity } from "@/lib/booking";
import { rupiah } from "@/lib/format";
import { useLocale, useLp, useT } from "@/i18n/client";
import { PaymentResult } from "@/components/payment-result";
import { BOOK_TOPIC, OPEN_CHAT } from "@/lib/support-topics";

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

const STEPS = ["Your details", "Date & time", "Payment"] as const;
const DETAIL_KEYS = ["name", "email", "phone", "organisation", "topic"] as const;

/** Progress bar for the three booking steps. Finished steps can be clicked to go back. */
function Progress({ step, go }: { step: number; go: (n: number) => void }) {
  const t = useT();
  return (
    <ol className="grid grid-cols-3 gap-2 max-sm:[grid-template-columns:var(--cols)]" aria-label={t("Booking steps")}
      style={{ "--cols": STEPS.map((_, i) => (i + 1 === step ? "minmax(0,3fr)" : "minmax(0,1fr)")).join(" ") } as React.CSSProperties}>
      {STEPS.map((label, i) => {
        const n = i + 1, done = n < step, current = n === step;
        const inner = (
          <>
            <span className={`h-1 w-full rounded-full ${n <= step ? "bg-teal" : "bg-line"}`} />
            <span className={`flex items-center gap-2 text-sm ${current ? "font-semibold text-ink" : done ? "text-teal" : "text-muted"}`}>
              <span className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs ${current ? "bg-teal text-white" : done ? "bg-teal-tint text-teal" : "bg-surface text-muted"}`}>
                {done ? <Check size={14} aria-hidden /> : n}
              </span>
              {/* on phones only the current step shows its name */}
              <span className={`truncate ${current ? "" : "max-sm:sr-only"}`}>{t(label)}</span>
            </span>
          </>
        );
        return (
          <li key={label} aria-current={current ? "step" : undefined}>
            {done ? (
              <button type="button" onClick={() => go(n)} className="flex w-full flex-col gap-2 text-left hover:opacity-80">{inner}</button>
            ) : (
              <div className="flex flex-col gap-2">{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Paid booking in three steps: fill in the details, pick a free slot, then pay with Midtrans. */
export function BookingForm({ feeUsd, fx, ready, snapJs, clientKey }: { feeUsd: number | null; fx: number | null; ready: boolean; snapJs: string; clientKey: string }) {
  const t = useT();
  const L = useLp();
  const locale = useLocale();
  const router = useRouter();
  const { ready: authReady, signedIn } = useAuth();
  const dl = (d: string, opts?: Intl.DateTimeFormatOptions) =>
    opts ? new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)) : dateLabel(d, locale === "ja" ? "ja-JP" : "en-GB");

  // Computed in the browser only: the page is prerendered at build time, so a server-side list would
  // show the build day's dates and mismatch on hydration once the day changes.
  const [dates, setDates] = useState<string[]>([]);
  useEffect(() => setDates(bookableDates()), []);
  const [result, setResult] = useState<{ state: "paid" | "pending"; go: () => void } | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  // Time zone only changes how slots are displayed; bookings are stored and checked in JST on the server.
  const [tz, setTz] = useState(JST_TZ);
  const [zones, setZones] = useState<string[]>([JST_TZ]);
  useEffect(() => {
    const mine = Intl.DateTimeFormat().resolvedOptions().timeZone || JST_TZ;
    setTz(mine);
    // sorted by offset so the list reads west to east
    const now = new Date();
    const mins = (z: string) => { const m = /UTC([+-])(\d+)(?::(\d+))?/.exec(utcOffset(z, now)); return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0; };
    setZones([...new Set([mine, ...ZONES])].sort((a, b) => mins(a) - mins(b)));
  }, []);
  const loc = locale === "ja" ? "ja-JP" : "en-GB";
  const local = tz !== JST_TZ;
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const [step, setStep] = useState(1);
  const [recap, setRecap] = useState<{ name: string; email: string; topic: string } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const go = (n: number) => {
    setStep(n);
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      topRef.current?.focus({ preventScroll: true });
    });
  };
  // Step 1 -> 2: the browser's own checks on the detail fields, shown as messages under each field.
  function detailsOk() {
    const f = ref.current;
    if (!f) return false;
    const next: Fields = {};
    for (const k of DETAIL_KEYS) {
      const el = f.elements.namedItem(k) as HTMLInputElement | HTMLSelectElement | null;
      if (el && !el.checkValidity()) next[k] = [el.validity.valueMissing ? "This field is required." : "Check this field."];
    }
    setFields(next);
    const first = DETAIL_KEYS.find((k) => next[k]);
    if (first) (f.elements.namedItem(first) as HTMLElement | null)?.focus();
    return !first;
  }
  const { ready: formOk, check, ref } = useReady(() => Boolean(date && time));
  // "Book a consultation" in a chat auto reply: preselect that topic and start at step 1.
  useEffect(() => {
    const onBook = (e: Event) => {
      const id = (e as CustomEvent<string | null>).detail;
      const sel = ref.current?.elements.namedItem("topic") as HTMLSelectElement | null;
      if (sel && id && [...sel.options].some((o) => o.value === id)) sel.value = id;
      if (ref.current) check({ currentTarget: ref.current } as React.SyntheticEvent<HTMLFormElement>);
      go(1);
    };
    addEventListener(BOOK_TOPIC, onBook);
    return () => removeEventListener(BOOK_TOPIC, onBook);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Logged-out visitors: keep what they typed while they log in, then bring it back with a clear note
  // that nothing has been booked or charged yet.
  const DRAFT = "anargya-booking-draft";
  const [restored, setRestored] = useState(false);
  function saveDraft() {
    const f = ref.current;
    if (!f) return;
    const data = Object.fromEntries([...new FormData(f).entries()].filter(([k]) => ["name", "email", "phone", "organisation", "topic", "message"].includes(k)));
    try { sessionStorage.setItem(DRAFT, JSON.stringify({ ...data, date, time })); } catch {}
  }
  useEffect(() => {
    if (!authReady || !signedIn || !ref.current) return;
    let d: Record<string, string> | null = null;
    try { d = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null"); sessionStorage.removeItem(DRAFT); } catch {}
    const form = ref.current;
    const fill = (k: string, v: unknown) => {
      const el = form.elements.namedItem(k) as HTMLInputElement | null;
      if (el && !el.value && typeof v === "string" && v) el.value = v;
    };
    if (d) {
      for (const k of ["name", "email", "phone", "organisation", "topic", "message"]) fill(k, d[k]);
      if (d.date && isBookableDate(d.date)) setDate(d.date);
      if (d.time) setTime(d.time);
      setRestored(true);
      if (d.date && d.time) setStep(3);
    }
    // Signed-in visitors: fill the remaining contact fields from their profile and saved address.
    import("@/lib/supabase/client").then(async ({ supabaseBrowser }) => {
      const { data } = (await supabaseBrowser()?.auth.getSession()) ?? { data: { session: null } };
      const u = data.session?.user;
      if (!u) return;
      const m = (u.user_metadata ?? {}) as { full_name?: string; phone?: string; shipping_address?: { buyer_name?: string; phone?: string } };
      fill("name", m.full_name || m.shipping_address?.buyer_name);
      fill("email", u.email);
      fill("phone", m.phone || m.shipping_address?.phone);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, signedIn]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formOk || !canPay) return;
    setBusy(true); setErr(""); setFields({});
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), date, time, locale };
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.login) { saveDraft(); return router.push(L(`/login?next=${encodeURIComponent(L("/consulting"))}`)); }
        if (data.pendingId) return router.push(L(`/consulting/booking/${data.pendingId}`));
        setErr(t(data.error ?? "Could not send the request."));
        setFields(data.fields ?? {});
        const bad = Object.keys(data.fields ?? {});
        if (bad.some((k) => (DETAIL_KEYS as readonly string[]).includes(k))) go(1);
        else if (data.taken || bad.length) go(2);
        if (data.taken) { setTime(""); loadTaken(); }
        return;
      }
      const view = () => router.push(L(`/consulting/booking/${data.id}`));
      const goPaid = () => router.push(L(`/consulting/booking/${data.id}?paid=1`));
      if (window.snap) window.snap.pay(data.token, { onSuccess: () => setResult({ state: "paid", go: goPaid }), onPending: () => setResult({ state: "pending", go: view }), onClose: view, onError: () => setErr(t("Payment failed. You can try again.")) });
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
      <PaymentResult state={result?.state ?? null} onView={() => result?.go()} viewLabel="View booking" />
      {canPay && <Script src={snapJs} data-client-key={clientKey} strategy="afterInteractive" />}
      <div ref={topRef} tabIndex={-1} className="scroll-mt-20 outline-none">
        <Progress step={step} go={go} />
      </div>
      {/* All steps stay in one form (hidden, not unmounted) so nothing typed is lost when going back. */}
      <form ref={ref} onSubmit={submit} onInput={check} onChange={check} noValidate className="flex flex-col gap-4">
        {/* 1. details */}
        <fieldset hidden={step !== 1} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5">
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
          <div className="flex justify-end border-t border-line pt-4">
            <button type="button" className="btn btn-teal" onClick={() => { if (!detailsOk()) return; const f = new FormData(ref.current!); setRecap({ name: String(f.get("name") ?? ""), email: String(f.get("email") ?? ""), topic: String(f.get("topic") ?? "") }); go(2); }}>{t("Next: date & time")}<ArrowRight size={16} aria-hidden /></button>
          </div>
        </fieldset>

        {/* 2. slot */}
        <fieldset hidden={step !== 2} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold"><Clock size={18} className="text-teal" aria-hidden />{t("Time")}<Req /></p>
              <label className="flex items-center gap-2 text-xs text-muted">
                {t("Your time zone")}
                <select className="input h-8 min-h-0 w-auto max-w-[200px] py-0 text-xs" value={tz} onChange={(e) => setTz(e.target.value)}>
                  {zones.map((z) => <option key={z} value={z}>{`${utcOffset(z)} · ${zoneCity(z)}${z === JST_TZ ? " (JST)" : ""}`}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t("Time")}>
              {SLOTS.map((s) => {
                const off = !date || taken.has(`${date} ${s}`);
                return (
                  <label key={s} className={`${chip} font-mono ${off ? "cursor-not-allowed border-line text-neutral-400 line-through" : "cursor-pointer"} ${time === s ? "border-teal bg-teal text-white" : off ? "" : "border-line hover:border-teal"}`}>
                    <input type="radio" name="time-pick" value={s} className="sr-only" disabled={off} checked={time === s} onChange={() => setTime(s)} />
                    {local && date ? (() => {
                      const z = slotInZone(date, s, tz, loc);
                      return <span className="flex flex-col items-center leading-tight"><span>{z.time}</span><span className={`text-[10px] ${time === s ? "text-white/80" : "text-muted"}`}>{s} JST{z.shift ? ` (${z.shift > 0 ? "+" : "−"}${Math.abs(z.shift)}d)` : ""}</span></span>;
                    })() : s}
                    {off && date && <span className="sr-only"> {t("(taken)")}</span>}
                  </label>
                );
              })}
            </div>
            {fe("time") && <p className="text-[13px] text-oxide">{t(fe("time")!)}</p>}
            {local && date && <p className="text-xs text-muted">{t("Your time: {off}. JST: UTC+9.", { off: utcOffset(tz) })}{SLOTS.some((s) => slotInZone(date, s, tz).shift) ? ` ${t("−1d = the day before.")}` : ""}</p>}
            <p className="text-xs text-muted">{t("Taken times are crossed out.")}</p>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
            <button type="button" className="btn btn-outline" onClick={() => go(1)}><ArrowLeft size={16} aria-hidden />{t("Back")}</button>
            <span className="flex items-center gap-2">
              <button type="button" className="btn btn-teal" disabled={!date || !time} onClick={() => go(3)}>{t("Next: payment")}<ArrowRight size={16} aria-hidden /></button>
              {/* small Customer Service shortcut, bottom right of the calendar */}
              <button type="button" onClick={() => dispatchEvent(new Event(OPEN_CHAT))} aria-label={t("Chat with our Customer Service")} title={t("Chat with our Customer Service")}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-teal text-teal hover:bg-teal-tint"><Headset size={18} aria-hidden /></button>
            </span>
          </div>
        </fieldset>

        {/* 3. summary + pay */}
        <section hidden={step !== 3} aria-labelledby="bk-sum" className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
          <h2 id="bk-sum" className="font-semibold">{t("Summary")}</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Session")}</dt><dd className="text-right">{t("90-minute meetup/call")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Date")}</dt><dd className="text-right">{date ? dl(date) : "-"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Time")}</dt><dd className="text-right font-mono">{time ? (local && date ? <>{(() => { const z = slotInZone(date, time, tz, loc); return `${z.day ? `${z.day}, ` : ""}${z.time} (${utcOffset(tz)})`; })()}<span className="block text-xs text-muted">{time} JST (UTC+9)</span></> : `${time} JST (UTC+9)`) : "-"}</dd></div>
            {recap && <>
              <div className="flex justify-between gap-3"><dt className="text-muted">{t("Name")}</dt><dd className="text-right">{recap.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{t("Email")}</dt><dd className="text-right [overflow-wrap:anywhere]">{recap.email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{t("Topic")}</dt><dd className="text-right">{t(TOPICS.find((o) => o.id === recap.topic)?.label ?? "-")}</dd></div>
            </>}
            <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="font-semibold">{t("Fee")}</dt><dd className="font-medium">{feeUsd ? <Price usd={feeUsd} /> : t("Not set")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("Charged in IDR")}</dt><dd className="font-mono">{feeUsd && fx ? `≈ ${rupiah(Math.ceil(feeUsd * fx))}` : t("Rate not set")}</dd></div>
          </dl>
          {!canPay && <p role="status" className="rounded-lg bg-ochre-tint p-3 text-[13px]">{t("Paid booking is not configured yet (CONSULT_FEE_USD, FX_USD_IDR or Midtrans keys missing).")}</p>}
          {restored && <p role="status" className="rounded-lg bg-teal-tint p-3 text-[13px] text-teal">{t("You are logged in. Your booking is not made yet: check the details and press Pay and book. Nothing has been charged.")}</p>}
          {err && <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{err}</p>}
          {authReady && !signedIn ? (
            <>
              <Link href={L(`/login?next=${encodeURIComponent(L("/consulting"))}`)} onClick={saveDraft} className="btn btn-teal btn-lg w-full">{t("Log in to book")}</Link>
              <p className="text-xs text-muted">{t("You need an account to book. What you typed is kept. Nothing is booked or charged until you pay.")}</p>
            </>
          ) : (
            <button type="submit" className="btn btn-pay btn-lg w-full" disabled={!formOk || !canPay || busy || !authReady}>{t(busy ? "Opening Midtrans…" : "Pay and book")}</button>
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted"><Lock size={14} className="mt-0.5 shrink-0 text-teal" aria-hidden />{t("The slot is held for 15 minutes while you pay. Unpaid bookings are released automatically.")}</p>
          <button type="button" className="btn btn-outline w-fit" onClick={() => go(2)}><ArrowLeft size={16} aria-hidden />{t("Back")}</button>
        </section>
      </form>
    </>
  );
}
