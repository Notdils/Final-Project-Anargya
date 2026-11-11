"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Req, useReady } from "@/components/auth-forms";
import { useLp, useT } from "@/i18n/client";

const Alert = ({ children }: { children: React.ReactNode }) => (
  <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{children}</p>
);

export function ForgotForm() {
  const t = useT();
  const L = useLp();
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { ready, check, ref } = useReady();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready) return;
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: new FormData(e.currentTarget).get("email") }) });
      const data = await res.json();
      if (!res.ok) setErr(t(data.error ?? "Something went wrong."));
      else setSent(true);
    } catch {
      setErr(t("Network error. Try again."));
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-lg bg-teal-tint p-5">
        <p className="font-semibold text-teal">{t("Check your email")}</p>
        <p className="text-sm text-[#404040]">{t("If an account exists for that address, we sent a link to set a new password. It expires in one hour.")}</p>
        <Link href={L("/login")} className="btn btn-outline w-fit">{t("Back to log in")}</Link>
      </div>
    );
  return (
    <form ref={ref} onSubmit={submit} onInput={check} onFocus={check} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.02em]">{t("Reset password")}</h1>
        <p className="text-sm text-muted">{t("Enter your account email and we will send you a reset link.")}</p>
      </div>
      {err && <Alert>{err}</Alert>}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">{t("Email")}<Req /></label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder={t("you@company.com")} />
      </div>
      <button type="submit" className="btn btn-teal btn-lg w-full" disabled={busy || !ready}>{t(busy ? "Sending…" : "Send reset link")}</button>
      <p className="text-center text-sm text-muted"><Link href={L("/login")} className="font-medium text-teal hover:underline">{t("Back to log in")}</Link></p>
    </form>
  );
}

export function ResetForm() {
  const t = useT();
  const L = useLp();
  const [err, setErr] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const { ready, check, ref } = useReady((f) => {
    const pw = (f.elements.namedItem("password") as HTMLInputElement).value;
    const cf = (f.elements.namedItem("confirm") as HTMLInputElement).value;
    setMismatch(cf.length > 0 && pw !== cf);
    return pw === cf;
  });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready) return;
    setErr("");
    setFields({});
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: fd.get("password"), confirm: fd.get("confirm") }) });
      const data = await res.json();
      if (!res.ok) {
        setErr(t(data.error ?? "Could not update the password."));
        if (data.fields) setFields(Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k, (v as string[])[0]])));
        return;
      }
      window.location.assign(L(data.redirect));
    } catch {
      setErr(t("Network error. Try again."));
    } finally {
      setBusy(false);
    }
  }
  const msg = (id: "password" | "confirm") => { const m = fields[id] ?? (id === "confirm" && mismatch ? "Passwords do not match." : undefined); return m && t(m); };
  const field = (id: "password" | "confirm", label: string, hint?: string) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">{t(label)}<Req /></label>
      <input id={id} name={id} type="password" autoComplete="new-password" required minLength={id === "password" ? 8 : undefined} className="input" aria-invalid={Boolean(msg(id))} aria-describedby={`${id}-msg`} />
      {msg(id) ? <p id={`${id}-msg`} className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{msg(id)}</p> : hint ? <p id={`${id}-msg`} className="text-[13px] text-muted">{t(hint)}</p> : null}
    </div>
  );
  return (
    <form ref={ref} onSubmit={submit} onInput={check} onFocus={check} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.02em]">{t("Set a new password")}</h1>
        <p className="text-sm text-muted">{t("You are signed in from the reset link. Choose a new password.")}</p>
      </div>
      {err && <Alert>{err}</Alert>}
      <div className="flex flex-col gap-4">
        {field("password", "New password", "At least 8 characters.")}
        {field("confirm", "Confirm new password")}
      </div>
      <button type="submit" className="btn btn-teal btn-lg w-full" disabled={busy || !ready}>{t(busy ? "Saving…" : "Save password")}</button>
    </form>
  );
}
