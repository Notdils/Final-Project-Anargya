"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Pencil, UserRound } from "lucide-react";
import { useLp, useT } from "@/i18n/client";

type P = { name: string | null; phone: string | null; email: string; since: string | null };

export function ProfileCard({ name, phone, email, since }: P) {
  const t = useT();
  const L = useLp();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErr({});
    const res = await fetch("/api/account/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: fd.get("name"), phone: fd.get("phone") }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      const f = data?.fields ?? {};
      setErr({ name: f.name?.[0], phone: f.phone?.[0], form: data?.error ?? "Could not save. Try again." });
      return;
    }
    setEditing(false);
    setSaved(true);
    router.refresh();
  }

  const msg = (m?: string) => m && <p className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden /> {t(m)}</p>;

  return (
    <section aria-labelledby="profile-title" className="flex flex-col gap-3 rounded-xl border border-line p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="profile-title" className="flex items-center gap-2 font-semibold"><UserRound size={18} className="text-teal" aria-hidden />{t("Profile")}</h2>
        {!editing && <button type="button" className="btn btn-outline min-h-8 px-3 py-1 text-sm" onClick={() => { setEditing(true); setSaved(false); }}><Pencil size={14} aria-hidden />{t("Edit")}</button>}
      </div>
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="pf-name" className="text-sm font-medium">{t("Full name")}</label>
            <input id="pf-name" name="name" className="input" defaultValue={name ?? ""} autoComplete="name" maxLength={80} aria-invalid={Boolean(err.name)} />
            {msg(err.name)}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="pf-phone" className="text-sm font-medium">{t("Phone")}</label>
            <input id="pf-phone" name="phone" className="input" defaultValue={phone ?? ""} autoComplete="tel" inputMode="tel" maxLength={20} placeholder="+81" aria-invalid={Boolean(err.phone)} />
            {msg(err.phone)}
          </div>
          <p className="text-xs text-muted">{t("Email cannot be changed here. Contact us if you need to move your account.")}</p>
          {msg(err.form)}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-teal" disabled={busy}>{t(busy ? "Saving…" : "Save")}</button>
            <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setErr({}); }}>{t("Cancel")}</button>
          </div>
        </form>
      ) : (
        <>
          {saved && <p role="status" className="flex items-center gap-1.5 text-sm text-teal"><Check size={14} aria-hidden />{t("Profile saved.")}</p>}
          <dl className="flex flex-col gap-2 text-sm">
            <div><dt className="text-muted">{t("Name")}</dt><dd>{name ?? "–"}</dd></div>
            <div><dt className="text-muted">{t("Phone")}</dt><dd>{phone || "–"}</dd></div>
            <div><dt className="text-muted">{t("Email")}</dt><dd className="[overflow-wrap:anywhere]">{email}</dd></div>
            {since && <div><dt className="text-muted">{t("Member since")}</dt><dd>{since}</dd></div>}
          </dl>
          <Link href={L("/reset-password")} className="w-fit text-sm font-medium text-teal hover:underline">{t("Change password")} →</Link>
        </>
      )}
    </section>
  );
}
