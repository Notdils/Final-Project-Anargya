"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck } from "lucide-react";
import { Req, useReady } from "./auth-forms";
import { SLOTS, TOPICS, bookableDates, dateLabel } from "@/lib/booking";
import { useLocale, useT } from "@/i18n/client";

type Fields = Partial<Record<"name" | "email" | "organisation" | "topic" | "date" | "time", string[]>>;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">{t(label)}<Req /></label>
      {children}
      {error && <p id={`${id}-err`} className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{t(error)}</p>}
    </div>
  );
}

export function BookingForm() {
  const t = useT();
  const locale = useLocale();
  const dl = (d: string) => dateLabel(d, locale === "ja" ? "ja-JP" : "en-GB");
  const dates = useMemo(() => bookableDates(), []);
  const [date, setDate] = useState(dates[0] ?? "");
  const [time, setTime] = useState<string>("");
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const [done, setDone] = useState<{ date: string; time: string; email: string } | null>(null);
  const { ready, check, ref } = useReady((f) => Boolean((f.elements.namedItem("time") as RadioNodeList)?.value));

  const loadTaken = () =>
    fetch("/api/bookings/slots", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { taken?: string[] }) => setTaken(new Set(d.taken ?? [])))
      .catch(() => {});
  useEffect(() => { loadTaken(); }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setErr(""); setFields({});
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setErr(t(data.error ?? "Could not send the request."));
        setFields(data.fields ?? {});
        if (data.taken) { setTime(""); loadTaken(); }
        return;
      }
      setDone({ date: data.date, time: data.time, email: String(body.email) });
    } catch {
      setErr(t("Network error. Try again."));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-xl border border-line bg-white p-6 md:p-8">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-tint text-teal"><CalendarCheck size={20} aria-hidden /></span>
        <h3 className="text-xl font-semibold">{t("Request received")}</h3>
        <p className="text-[#404040]">
          {t("{date} at {time} JST. We will confirm by email to", { date: dl(done.date), time: done.time })} <strong className="font-medium [overflow-wrap:anywhere]">{done.email}</strong> {t("within one working day.")}
        </p>
        <button type="button" className="btn btn-outline" onClick={() => { setDone(null); setTime(""); loadTaken(); }}>{t("Book another time")}</button>
      </div>
    );

  const fe = (k: keyof Fields) => fields[k]?.[0];
  return (
    <form ref={ref} onSubmit={submit} onInput={check} onChange={check} onFocus={check} noValidate className="flex flex-col gap-5 rounded-xl border border-line bg-white p-5 md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="name" label="Full name" error={fe("name")}><input id="name" name="name" className="input" autoComplete="name" required minLength={2} maxLength={80} placeholder={t("Your name")} /></Field>
        <Field id="email" label="Email" error={fe("email")}><input id="email" name="email" type="email" className="input" autoComplete="email" required maxLength={120} placeholder={t("you@team.com")} /></Field>
        <Field id="organisation" label="Team or company" error={fe("organisation")}><input id="organisation" name="organisation" className="input" autoComplete="organization" required minLength={2} maxLength={120} placeholder={t("Organisation")} /></Field>
        <Field id="topic" label="Topic" error={fe("topic")}>
          <select id="topic" name="topic" className="input" required defaultValue="">
            <option value="" disabled>{t("Choose a topic")}</option>
            {TOPICS.map((o) => <option key={o.id} value={o.id}>{t(o.label)}</option>)}
          </select>
        </Field>
        <Field id="date" label="Date" error={fe("date")}>
          <select id="date" name="date" className="input" required value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }}>
            {dates.map((d) => <option key={d} value={d}>{dl(d)}</option>)}
          </select>
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("Time (JST)")}<Req /></legend>
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((s) => {
              const off = taken.has(`${date} ${s}`);
              return (
                <label key={s} className={`relative cursor-pointer rounded-lg border px-3 py-2 font-mono text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal ${time === s ? "border-teal bg-teal text-white" : "border-line bg-white"} ${off ? "cursor-not-allowed line-through opacity-40" : ""}`}>
                  <input type="radio" name="time" value={s} required disabled={off} checked={time === s} onChange={() => setTime(s)} className="sr-only" />
                  {s}
                  {off && <span className="sr-only"> {t("(taken)")}</span>}
                </label>
              );
            })}
          </div>
          {fe("time") && <p className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{t(fe("time")!)}</p>}
        </fieldset>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-sm font-medium">{t("What would you like to discuss?")}</label>
        <textarea id="message" name="message" rows={4} maxLength={1000} className="input min-h-24 resize-y" placeholder={t("Optional. Your car, the problem, and your deadline.")} />
      </div>
      {/* honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {err && <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{err}</p>}
      <button type="submit" className="btn btn-ochre btn-lg w-full md:w-fit" disabled={!ready || busy}>{t(busy ? "Sending…" : "Request booking")}</button>
      <p className="text-xs text-muted">{t("Taken times are crossed out. You can change or cancel by replying to the confirmation email.")}</p>
    </form>
  );
}
