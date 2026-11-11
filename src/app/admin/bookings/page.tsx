import { guardPage } from "@/lib/admin-guard";
import { CalendarClock } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { topicLabel, dateLabel, todayJst } from "@/lib/booking";
import { jst } from "@/lib/format";
import { Pagination } from "@/components/admin/pagination";

export const metadata = { title: "Bookings" };

type Booking = { id: string; name: string; email: string; organisation: string; topic: string; slot_date: string; slot_time: string; message: string | null; status: "requested" | "confirmed" | "cancelled"; created_at: string; phone?: string | null; pay_status?: string; fee_usd?: number | null; charged_idr?: number | null; needs_review?: boolean };

const PAY_STYLE: Record<string, string> = { paid: "bg-teal-tint text-teal", pending: "bg-ochre-tint text-ink", failed: "bg-oxide-tint text-oxide", expired: "bg-surface-2 text-muted", unpaid: "bg-surface-2 text-muted" };

const STATUS_STYLE = { requested: "bg-ochre-tint text-ink", confirmed: "bg-teal-tint text-teal", cancelled: "bg-surface-2 text-muted" } as const;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ show?: string; page?: string }> }) {
  await guardPage("bookings.read");
  const sp = await searchParams;
  const show = sp.show === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number(sp.page) || 1);
  const SIZE = 20;
  let total = 0;
  let waiting = 0; // across all pages
  const sb = await supabaseServer();
  const today = todayJst();
  let rows: Booking[] = [];
  if (sb) {
    const q = sb.from("bookings").select("*", { count: "exact" });
    const { data, count } = show === "upcoming"
      ? await q.gte("slot_date", today).order("slot_date").order("slot_time").range((page - 1) * SIZE, page * SIZE - 1)
      : await q.lt("slot_date", today).order("slot_date", { ascending: false }).order("slot_time", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
    rows = (data ?? []) as Booking[];
    total = count ?? rows.length;
    if (show === "upcoming") waiting = (await sb.from("bookings").select("id", { count: "exact", head: true }).gte("slot_date", today).eq("status", "requested")).count ?? 0;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Bookings</h1>
          <p className="text-sm text-muted">Consultations. Times are JST. Paid bookings are confirmed automatically; send the call link by email.</p>
        </div>
        <nav aria-label="Booking range" className="flex gap-1 rounded-lg border border-line p-1 text-sm">
          {(["upcoming", "past"] as const).map((s) => (
            <a key={s} href={s === "upcoming" ? "/admin/bookings" : "/admin/bookings?show=past"} aria-current={show === s ? "page" : undefined} className={`rounded-md px-3 py-1 capitalize ${show === s ? "bg-teal text-white" : "text-muted"}`}>{s}</a>
          ))}
        </nav>
      </div>

      {show === "upcoming" && waiting > 0 && (
        <p role="status" className="rounded-lg bg-ochre-tint p-3 text-sm"><strong>{waiting}</strong> {waiting === 1 ? "request is" : "requests are"} waiting for a reply.</p>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line p-10 text-center">
          <CalendarClock size={20} className="text-muted" aria-hidden />
          <p className="font-medium">No {show} bookings.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 rounded-xl border border-line p-4 md:flex-row md:items-start md:justify-between md:p-5">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-mono text-sm">{dateLabel(b.slot_date)} · {b.slot_time} JST</p>
                <p className="font-medium">{b.name} <span className="font-normal text-muted">· {b.organisation}</span></p>
                <a href={`mailto:${b.email}`} className="text-sm text-teal [overflow-wrap:anywhere] hover:underline">{b.email}</a>
                {b.phone && <p className="text-sm">{b.phone}</p>}
                <p className="text-sm">{topicLabel(b.topic)}</p>
                {b.message && <p className="max-w-[640px] whitespace-pre-line text-sm text-muted">{b.message}</p>}
                <p className="text-xs text-muted">Requested {jst(b.created_at)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[b.status]}`}>{b.status}</span>
                {b.pay_status && b.pay_status !== "unpaid" && <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${PAY_STYLE[b.pay_status] ?? ""}`}>{b.pay_status}{b.fee_usd != null ? ` · $${Number(b.fee_usd)}` : ""}</span>}
                {b.needs_review && <span className="rounded bg-oxide-tint px-2 py-0.5 text-xs font-medium text-oxide">Needs review</span>}
                {b.status !== "confirmed" && (
                  <form action={`/api/admin/bookings/${b.id}`} method="post"><input type="hidden" name="status" value="confirmed" /><button className="btn btn-outline px-3">Confirm</button></form>
                )}
                {b.status !== "cancelled" && b.pay_status !== "pending" && (
                  <form action={`/api/admin/bookings/${b.id}`} method="post"><input type="hidden" name="status" value="cancelled" /><button className="btn btn-danger px-3">Cancel</button></form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={SIZE} total={total} href={(p) => `/admin/bookings?${new URLSearchParams({ ...(show === "past" && { show }), page: String(p) })}`} noun="bookings" />
    </div>
  );
}
