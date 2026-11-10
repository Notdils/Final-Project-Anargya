"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";

function Input({ id, label, error, hint, right, type = "text", ...rest }: { id: string; label: string; error?: string; hint?: string; right?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {right}
      </div>
      <div className="relative">
        <input id={id} name={id} type={isPw && show ? "text" : type} className={`input ${isPw ? "pr-10" : ""}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest} />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-err`} className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="flex items-start gap-2 rounded-lg bg-oxide-tint p-3 text-sm text-oxide"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />{children}</p>;
}

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [err, setErr] = useState(linkError ? "That link is invalid or expired. Request a new one." : "");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), password: fd.get("password"), next }) });
      const data = await res.json();
      if (!res.ok) return setErr(data.error ?? "Could not log in.");
      window.location.assign(data.redirect);
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.02em]">Log in</h1>
        <p className="text-sm text-muted">Order parts and download your receipts.</p>
      </div>
      {err && <Alert>{err}</Alert>}
      <div className="flex flex-col gap-4">
        <Input id="email" label="Email" type="email" autoComplete="email" required placeholder="you@company.com" />
        <Input id="password" label="Password" type="password" autoComplete="current-password" required right={<Link href="/forgot-password" className="text-[13px] font-medium text-teal hover:underline">Forgot password?</Link>} />
      </div>
      <button type="submit" className="btn btn-ochre btn-lg w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      <p className="text-center text-sm text-muted">No account? <Link href="/register" className="font-medium text-teal hover:underline">Create one</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [err, setErr] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [terms, setTerms] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setFields({});
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), confirm: fd.get("confirm"), terms }) });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not create the account.");
        if (data.fields) setFields(Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k, (v as string[])[0]])));
        return;
      }
      if (data.confirm) setSent(true);
      else window.location.assign(data.redirect);
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-lg bg-teal-tint p-5">
        <p className="font-semibold text-teal">Check your email</p>
        <p className="text-sm text-[#404040]">We sent a confirmation link. Open it, then log in.</p>
        <Link href="/login" className="btn btn-outline w-fit">Go to log in</Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.02em]">Create an account</h1>
        <p className="text-sm text-muted">Anyone can register to buy parts. Admin access is granted by the team.</p>
      </div>
      {err && <Alert>{err}</Alert>}
      <div className="flex flex-col gap-4">
        <Input id="name" label="Full name" autoComplete="name" error={fields.name} />
        <Input id="email" label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={fields.email} />
        <Input id="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." error={fields.password} />
        <Input id="confirm" label="Confirm password" type="password" autoComplete="new-password" error={fields.confirm} />
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="peer sr-only" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-[#d4d4d4] peer-checked:border-teal peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-teal">
            {terms && <Check size={12} strokeWidth={3} className="text-white" aria-hidden />}
          </span>
          I agree to the terms and privacy policy.
        </label>
        {fields.terms && <p className="text-[13px] text-oxide">{fields.terms}</p>}
      </div>
      <button type="submit" className="btn btn-ochre btn-lg w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      <p className="text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-teal hover:underline">Log in</Link></p>
    </form>
  );
}
