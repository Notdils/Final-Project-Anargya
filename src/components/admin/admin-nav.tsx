"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Box, CalendarClock, LayoutGrid, LogOut, MessagesSquare, Receipt, ShoppingBag, Truck, Users } from "lucide-react";
import { ADMIN_SECTIONS, ROLE_INFO, can, type Role } from "@/lib/rbac";

const ICONS: Record<string, typeof Box> = { "/admin": LayoutGrid, "/admin/orders": ShoppingBag, "/admin/receipts": Receipt, "/admin/bookings": CalendarClock, "/admin/products": Box, "/admin/shipping": Truck, "/admin/inbox": MessagesSquare, "/admin/users": Users };

export function AdminNav({ email, role }: { email: string | null; role: Role | null }) {
  const path = usePathname();
  // without Supabase (demo mode) show every section
  const ITEMS = ADMIN_SECTIONS.filter((s) => role === null || can(role, s.perm)).map((s) => ({ ...s, Icon: ICONS[s.href] }));
  const isOn = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  return (
    <>
      {/* mobile: header + tabs */}
      <header className="border-b border-line md:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2"><span className="text-sm font-semibold tracking-[0.12em]">ANARGYA</span><span className="eyebrow text-teal">Admin</span></span>
          <Link href="/" className="text-sm font-medium text-teal">Site</Link>
        </div>
        <nav aria-label="Admin" className="flex gap-5 overflow-x-auto px-5">
          {ITEMS.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={isOn(href) ? "page" : undefined} className={`-mb-px border-b-2 py-3 text-sm font-medium ${isOn(href) ? "border-teal text-teal" : "border-transparent text-muted"}`}>{label}</Link>
          ))}
        </nav>
      </header>

      {/* tablet: icon rail, desktop: full sidebar */}
      <aside className="sticky top-0 hidden h-svh shrink-0 flex-col gap-6 border-r border-line bg-surface px-3 py-5 md:flex xl:w-60 xl:px-4">
        <div className="flex items-center gap-2 xl:px-2">
          <span className="text-sm font-semibold tracking-[0.12em]"><span className="xl:hidden">A</span><span className="hidden xl:inline">ANARGYA</span></span>
          <span className="eyebrow hidden rounded border border-line px-1.5 py-0.5 xl:inline">Admin</span>
        </div>
        <nav aria-label="Admin" className="flex flex-col gap-1">
          {ITEMS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={isOn(href) ? "page" : undefined} title={label}
              className={`flex items-center gap-3 rounded-lg p-2 text-sm font-medium ${isOn(href) ? "bg-teal-tint text-teal" : "text-[#404040] hover:bg-surface-2"}`}>
              <Icon size={16} aria-hidden className={isOn(href) ? "text-teal" : "text-muted"} />
              <span className="sr-only xl:not-sr-only">{label}</span>
            </Link>
          ))}
          <Link href="/" title="Back to site" className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-[#404040] hover:bg-surface-2">
            <ArrowLeft size={16} aria-hidden className="text-muted" /><span className="sr-only xl:not-sr-only">Back to site</span>
          </Link>
        </nav>
        <div className="mt-auto flex items-center gap-2 xl:px-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-teal text-xs font-medium text-white" aria-hidden>{(email ?? "A")[0].toUpperCase()}</span>
          <div className="hidden min-w-0 flex-col xl:flex">
            <span className="truncate text-[13px] font-medium">{email ?? "Not signed in"}</span>
            {role && <span className="text-xs text-muted">{ROLE_INFO[role].label}</span>}
            <form action="/api/auth/logout" method="post"><button className="flex items-center gap-1 text-xs text-muted hover:text-ink"><LogOut size={12} aria-hidden />Log out</button></form>
          </div>
        </div>
      </aside>
    </>
  );
}
