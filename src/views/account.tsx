import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Package, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SlimFooter } from "@/components/site-footer";
import { OrderStatusBadge } from "@/components/status-badge";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { jst } from "@/lib/format";
import { orderAmount, usd } from "@/lib/money";
import { lastAddress, type Order } from "@/lib/orders";
import { reconcileOrder } from "@/lib/reconcile";
import { TOPICS, dateLabel } from "@/lib/booking";
import { lp, translator, type Locale } from "@/i18n";
import { destinationLabel } from "@/lib/shipping";


type Row = Pick<Order, "id" | "receipt_no" | "total_jpy" | "total_usd" | "status" | "created_at"> & { order_items?: { name: string; qty: number }[] };

export default async function AccountView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const L = (p: string) => lp(p, locale);
  const { user } = await currentUser();
  const sb = await supabaseServer();
  const load = async () =>
    sb
      ? ((await sb.from("orders").select("id, receipt_no, total_jpy, total_usd, status, created_at, order_items(name, qty)").eq("user_id", user?.id ?? "").order("created_at", { ascending: false }).limit(50)).data as Row[] | null) ?? []
      : [];
  let orders = await load();
  const pending = orders.filter((o) => o.status === "pending").slice(0, 5);
  if (pending.length) {
    await Promise.all(pending.map((o) => reconcileOrder(o.id).catch(() => {})));
    orders = await load();
  }
  const saved = await lastAddress();
  type BookingRow = { id: string; slot_date: string; slot_time: string; topic: string; pay_status: string; status: string };
  const bookings: BookingRow[] = sb && user
    ? (((await sb.from("bookings").select("id, slot_date, slot_time, topic, pay_status, status").eq("user_id", user.id).order("slot_date", { ascending: false }).limit(20)).data as BookingRow[] | null) ?? [])
    : [];
  const bookingBadge = (b: BookingRow) =>
    b.status === "confirmed" ? ["Confirmed", "bg-teal-tint text-teal"] : b.pay_status === "pending" ? ["Waiting for payment", "bg-ochre-tint text-ink"] : b.status === "cancelled" ? ["Not completed", "bg-surface-2 text-muted"] : ["Requested", "bg-ochre-tint text-ink"];
  const paid = orders.filter((o) => o.status === "paid");
  const spent = paid.reduce((s, o) => s + Number(o.total_usd ?? 0), 0); // USD orders only (older JPY test orders excluded)
  const waiting = orders.filter((o) => o.status === "pending").length;
  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? saved?.buyer_name ?? null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="pt-16">
        <div className="container-x flex flex-col gap-8 py-6 md:py-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow text-teal">{t("Account")}</p>
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-[40px] md:leading-[48px]">{name ? t("Hello, {name}", { name: name.split(" ")[0] }) : t("Your account")}</h1>
            </div>
            <form action="/api/auth/logout" method="post"><button className="btn btn-outline">{t("Log out")}</button></form>
          </div>

          <dl className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              ["Orders", String(orders.length)],
              ["Paid total", usd(spent)],
              ["Awaiting payment", String(waiting)],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 rounded-xl border border-line p-4 md:p-5">
                <dt className="text-xs text-muted md:text-sm">{t(k)}</dt>
                <dd className="font-mono text-base font-medium md:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-8 xl:grid-cols-[1fr_360px] xl:gap-12">
            <section aria-labelledby="orders-title" className="flex flex-col gap-3">
              <h2 id="orders-title" className="flex items-center gap-2 text-lg font-semibold"><Package size={18} className="text-teal" aria-hidden />{t("Orders")}</h2>
              {orders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-10 text-center">
                  <p className="font-medium">{t("No orders yet.")}</p>
                  <Link href={L("/marketplace")} className="btn btn-ochre mt-4">{t("Browse marketplace")}</Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {orders.map((o) => {
                    const items = o.order_items ?? [];
                    const summary = items.length ? `${items[0].name}${items.length > 1 ? t(" + {n} more", { n: items.length - 1 }) : ""}` : "";
                    return (
                      <li key={o.id}>
                        <Link href={L(`/receipt/${o.id}`)} className="flex items-center justify-between gap-3 rounded-lg border border-line p-4 hover:bg-surface">
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="font-mono text-sm">{o.receipt_no}</span>
                            {summary && <span className="truncate text-sm">{summary}</span>}
                            <span className="text-xs text-muted">{jst(o.created_at)} · {orderAmount(o)}</span>
                          </span>
                          <OrderStatusBadge status={o.status} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              <section aria-labelledby="consult-title" className="mt-6 flex flex-col gap-3">
                <h2 id="consult-title" className="flex items-center gap-2 text-lg font-semibold"><CalendarDays size={18} className="text-teal" aria-hidden />{t("Consultations")}</h2>
                {bookings.length === 0 ? (
                  <p className="text-sm text-muted">{t("No consultations yet.")}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {bookings.map((b) => {
                      const [label, cls] = bookingBadge(b);
                      return (
                        <li key={b.id}>
                          <Link href={L(`/consulting/booking/${b.id}`)} className="flex items-center justify-between gap-3 rounded-lg border border-line p-4 hover:bg-surface">
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="font-mono text-sm">{dateLabel(b.slot_date, locale === "ja" ? "ja-JP" : "en-GB")} · {b.slot_time} JST</span>
                              <span className="truncate text-sm text-muted">{t(TOPICS.find((x) => x.id === b.topic)?.label ?? b.topic)}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{t(label)}</span><ChevronRight size={16} className="text-muted" aria-hidden /></span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link href={L("/consulting")} className="w-fit text-sm font-medium text-teal hover:underline">{t("Book a consultation")} →</Link>
              </section>
            </section>

            <aside className="flex flex-col gap-4">
              <section aria-labelledby="profile-title" className="flex flex-col gap-3 rounded-xl border border-line p-5">
                <h2 id="profile-title" className="flex items-center gap-2 font-semibold"><UserRound size={18} className="text-teal" aria-hidden />{t("Profile")}</h2>
                <dl className="flex flex-col gap-2 text-sm">
                  {name && <div><dt className="text-muted">{t("Name")}</dt><dd>{name}</dd></div>}
                  <div><dt className="text-muted">{t("Email")}</dt><dd className="[overflow-wrap:anywhere]">{user?.email}</dd></div>
                  {user?.created_at && <div><dt className="text-muted">{t("Member since")}</dt><dd>{jst(user.created_at).split(",")[0]}</dd></div>}
                </dl>
              </section>
              <section aria-labelledby="addr-title" className="flex flex-col gap-3 rounded-xl border border-line p-5">
                <h2 id="addr-title" className="flex items-center gap-2 font-semibold"><MapPin size={18} className="text-teal" aria-hidden />{t("Shipping address")}</h2>
                {saved ? (
                  <>
                    <address className="text-sm not-italic leading-6">
                      {saved.buyer_name}<br />{saved.address}<br />{saved.city} {saved.postal_code}<br />{destinationLabel(saved.country, saved.ship_region, locale, saved.ship_country)}<br />
                      <span className="text-muted">{saved.phone}</span>
                    </address>
                    <p className="text-xs text-muted">{t("Taken from your latest order and filled in at checkout. Change it there for your next order.")}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted">{t("Your address is saved after your first order, so you do not have to type it again.")}</p>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>
      <SlimFooter />
    </>
  );
}
