"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, MoreHorizontal, Search, ShieldCheck, X } from "lucide-react";
import { ROLE_INFO, STAFF_ROLES, type Role } from "@/lib/rbac";
import type { AdminUser } from "@/lib/admin-users";

const ROLES: Role[] = [...STAFF_ROLES, "customer"];
const when = (s: string | null, time = false) =>
  s ? new Intl.DateTimeFormat("en-GB", time ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" } : { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(s)) : "–";

function RoleBadge({ role }: { role: Role }) {
  const staff = role !== "customer";
  return <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${staff ? "bg-teal-tint text-teal" : "bg-surface-2 text-[#404040]"}`}>{staff && <ShieldCheck size={12} aria-hidden />}{ROLE_INFO[role].label}</span>;
}

export function UsersManager({ users, meId }: { users: AdminUser[]; meId: string | null }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<"all" | "staff" | Role>("all");
  const [menu, setMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const shown = useMemo(() => users.filter((u) => {
    const t = q.trim().toLowerCase();
    return (!t || u.email.toLowerCase().includes(t) || (u.name ?? "").toLowerCase().includes(t)) && (roleF === "all" || (roleF === "staff" ? u.role !== "customer" : u.role === roleF));
  }), [users, q, roleF]);
  const SIZE = 20;
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(shown.length / SIZE));
  const cur = Math.min(page, pages); // filters shrink the list: stay on a page that exists
  const pageRows = shown.slice((cur - 1) * SIZE, cur * SIZE);

  useEffect(() => {
    const close = () => setMenu(null);
    addEventListener("click", close);
    return () => removeEventListener("click", close);
  }, []);

  async function reset(u: AdminUser) {
    const res = await fetch(`/api/admin/users/${u.id}/reset`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    flash(res?.ok ? `Password reset email sent to ${u.email}.` : data?.error ?? "Could not send.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Users</h1>
        <p className="text-sm text-muted">Customers and staff. Roles are stored on the server; nobody can give themselves a role.</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search users</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="input pl-9" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label><span className="sr-only">Role</span>
          <select className="input w-auto pr-8" value={roleF} onChange={(e) => setRoleF(e.target.value as typeof roleF)}>
            <option value="all">Role: All</option><option value="staff">Staff only</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface"><tr className="eyebrow text-left text-muted">
            <th className="px-4 py-3 font-medium">User</th><th className="px-2 py-3 font-medium">Role</th><th className="px-2 py-3 font-medium">Orders</th>
            <th className="px-2 py-3 font-medium">Bookings</th><th className="px-2 py-3 font-medium">Joined</th><th className="px-2 py-3 font-medium">Last sign-in</th><th className="w-12" />
          </tr></thead>
          <tbody>
            {pageRows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-medium ${u.role !== "customer" ? "bg-teal text-white" : "bg-surface-2 text-[#404040]"}`}>{(u.name ?? u.email)[0]?.toUpperCase()}</span>
                    <span className="flex min-w-0 flex-col"><span className="font-medium">{u.name ?? "–"}{u.id === meId && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}</span><span className="truncate text-xs text-muted">{u.email}</span></span>
                  </span>
                </td>
                <td className="px-2 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-2 py-3 font-mono">{u.orders}</td>
                <td className="px-2 py-3 font-mono">{u.bookings}</td>
                <td className="px-2 py-3 text-[13px] text-[#404040]">{when(u.created_at)}</td>
                <td className="px-2 py-3 font-mono text-xs text-muted">{when(u.last_sign_in_at, true)}</td>
                <td className="relative pr-3 text-right">
                  <button type="button" className="rounded p-1.5 text-muted hover:bg-surface-2" aria-label={`Actions for ${u.email}`} aria-expanded={menu === u.id} onClick={(e) => { e.stopPropagation(); setMenu(menu === u.id ? null : u.id); }}><MoreHorizontal size={16} aria-hidden /></button>
                  {menu === u.id && (
                    <div role="menu" className="absolute right-3 top-10 z-20 flex min-w-48 flex-col rounded-lg border border-line bg-white py-1 text-left shadow-[0_4px_16px_rgba(0,0,0,0.08)]" onClick={(e) => e.stopPropagation()}>
                      <a role="menuitem" href={`/admin/orders?q=${encodeURIComponent(u.email)}`} className="px-3 py-2 text-[13px] hover:bg-surface">View orders</a>
                      <button role="menuitem" type="button" disabled={u.id === meId} className="px-3 py-2 text-left text-[13px] hover:bg-surface disabled:text-muted" onClick={() => { setMenu(null); setDialog(u); }}>{u.id === meId ? "Change role (not your own)" : "Change role…"}</button>
                      <button role="menuitem" type="button" className="px-3 py-2 text-left text-[13px] hover:bg-surface" onClick={() => { setMenu(null); reset(u); }}>Send password reset</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="border-t border-line p-8 text-center text-sm text-muted">No users match.</p>}
      </div>
      <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Showing <span className="font-mono">{shown.length ? (cur - 1) * SIZE + 1 : 0}–{Math.min(shown.length, cur * SIZE)}</span> of <span className="font-mono">{shown.length}</span> users</p>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-outline px-3 text-sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</button>
            <span className="px-2 font-mono text-sm">{cur} / {pages}</span>
            <button type="button" className="btn btn-outline px-3 text-sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</button>
          </div>
        )}
      </nav>
      <p className="text-xs text-muted">A new role applies the next time the user signs in or within an hour. Every change is recorded in the audit log.</p>
      {toast && <p role="status" className="fixed bottom-5 right-5 z-[1300] rounded-lg bg-ink px-4 py-2 text-sm text-white">{toast}</p>}
      {dialog && <RoleDialog u={dialog} onClose={() => setDialog(null)} onDone={(m) => { setDialog(null); flash(m); router.refresh(); }} />}
    </div>
  );
}

function RoleDialog({ u, onClose, onDone }: { u: AdminUser; onClose: () => void; onDone: (m: string) => void }) {
  const [role, setRole] = useState<Role>(u.role);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  const ok = confirm.trim().toLowerCase() === u.email.toLowerCase() && role !== u.role;
  async function save() {
    setBusy(true); setErr("");
    const res = await fetch(`/api/admin/users/${u.id}/role`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role, confirmEmail: confirm }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setErr(data?.error ?? "Network error. Try again.");
    onDone(`${u.email} is now ${ROLE_INFO[role].label}.`);
  }
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center p-5" role="dialog" aria-modal="true" aria-labelledby="role-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative flex w-full max-w-[460px] flex-col gap-4 rounded-xl bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="role-title" className="text-lg font-semibold">Change role for <span className="[overflow-wrap:anywhere]">{u.email}</span></h2>
          <button type="button" className="rounded p-1 text-muted" aria-label="Close" onClick={onClose}><X size={16} aria-hidden /></button>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Role</legend>
          {ROLES.map((r) => (
            <label key={r} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${role === r ? "border-teal bg-teal-tint" : "border-line"}`}>
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-1 accent-teal" />
              <span className="flex flex-col"><span className="text-sm font-medium">{ROLE_INFO[r].label}{r === u.role && <span className="ml-1.5 text-xs font-normal text-muted">(current)</span>}</span><span className="text-xs text-muted">{ROLE_INFO[r].desc}</span></span>
            </label>
          ))}
        </fieldset>
        {role === "admin" && role !== u.role && <p className="rounded-lg bg-oxide-tint p-3 text-[13px] text-oxide">Admins can see every order, address and booking, export receipts, change prices and stock, and change other people&apos;s roles.</p>}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Type the email to confirm</span>
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={u.email} autoComplete="off" />
        </label>
        {err && <p role="alert" className="flex items-center gap-1.5 text-[13px] text-oxide"><AlertCircle size={14} aria-hidden />{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-dark" disabled={!ok || busy} onClick={save}>{busy ? "Saving…" : "Change role"}</button>
        </div>
      </div>
    </div>
  );
}
