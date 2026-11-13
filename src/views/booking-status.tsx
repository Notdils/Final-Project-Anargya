import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { notFound } from "next/navigation";
import { AlertCircle, CalendarCheck, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabaseServer } from "@/lib/supabase/server";
import { reconcileBooking } from "@/lib/booking-pay";
import { topicLabel, dateLabel } from "@/lib/booking";
import { jst, rupiah } from "@/lib/format";
import { usd } from "@/lib/money";
import { lp, translator, type Locale } from "@/i18n";

type Row = {
  id: string; name: string; email: string; organisation: string; topic: string; slot_date: string; slot_time: string;
  pay_status: "unpaid" | "pending" | "paid" | "failed" | "expired"; status: string; fee_usd: number | null; charged_idr: number | null;
  snap_redirect_url: string | null; pay_expires_at: string | null; paid_at: string | null; pay_method: string | null;
};

export default async function BookingStatusView({ id, locale, justPaid = false }: { id: string; locale: Locale; justPaid?: boolean }) {
  const t = translator(locale);
  const L = (p: string) => lp(p, locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServer();
  if (!sb) notFound();
  const load = async () => (await sb.from("bookings").select("*").eq("id", id).maybeSingle()).data as Row | null; // RLS: own bookings only
  let b = await load();
  if (!b) notFound();
  if (b.pay_status === "pending") {
    await reconcileBooking(b.id);
    b = (await load()) ?? b;
  }
  // Snap already reported success: don't offer "Continue payment" while Midtrans' notification is on its way.
  const confirming = b.pay_status === "pending" && justPaid;
  const open = !confirming && b.pay_status === "pending" && Boolean(b.snap_redirect_url) && (!b.pay_expires_at || new Date(b.pay_expires_at).getTime() > Date.now());
  const when = `${dateLabel(b.slot_date, locale === "ja" ? "ja-JP" : "en-GB")} · ${b.slot_time} JST`;
  const banner =
    b.pay_status === "paid"
      ? { cls: "bg-teal-tint", tcls: "text-teal", icon: <CalendarCheck size={20} className="text-teal" aria-hidden />, title: t("Booking confirmed"), body: t("We will email the meetup/call details to {email} before the session.", { email: b.email }) }
      : b.pay_status === "pending"
        ? { cls: "bg-ochre-tint", tcls: "text-ink", icon: <Clock size={20} className="text-ochre" aria-hidden />, title: t(confirming ? "Confirming your payment" : "Waiting for payment"), body: open ? t("Your slot is held until {time}. If you already paid, this page updates by itself in a few seconds.", { time: jst(b.pay_expires_at!) }) : t("We are confirming your payment, please wait a moment.") }
        : { cls: "bg-surface-2", tcls: "text-ink", icon: <AlertCircle size={20} className="text-muted" aria-hidden />, title: t("Booking not completed"), body: t("No money was taken and the slot was released. You can book another time.") };

  return (
    <>
      <SiteHeader active="consulting" />
      {b.pay_status === "pending" && <AutoRefresh />}
      <main id="main" className="min-h-[70vh] pt-16">
        <div className="container-x flex justify-center py-6 md:py-12">
          <div className="flex w-full max-w-[640px] flex-col gap-6">
            <div role="status" className={`flex gap-3 rounded-lg p-4 ${banner.cls}`}>
              {banner.icon}
              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <p className={`font-semibold ${banner.tcls}`}>{banner.title}</p>
                  <p className="text-sm text-[#404040]">{banner.body}</p>
                </div>
                {open && <a href={b.snap_redirect_url!} className="btn btn-pay w-fit">{t("Continue payment")}</a>}
              </div>
            </div>
            <article className="flex flex-col gap-4 rounded-xl border border-line p-5 md:p-8">
              <p className="eyebrow text-teal">{t("Consultation")}</p>
              <p className="text-xl font-semibold">{when}</p>
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div><dt className="text-muted">{t("Topic")}</dt><dd>{t(topicLabel(b!.topic))}</dd></div>
                <div><dt className="text-muted">{t("Booked by")}</dt><dd className="[overflow-wrap:anywhere]">{b.name} · {b.organisation}</dd></div>
                <div><dt className="text-muted">{t("Fee")}</dt><dd className="font-mono">{b.fee_usd != null ? usd(Number(b.fee_usd)) : "-"}{b.charged_idr ? ` · ${rupiah(b.charged_idr)}` : ""}</dd></div>
                <div><dt className="text-muted">{t("Payment")}</dt><dd>Midtrans{b.pay_method ? ` · ${b.pay_method}` : ""}{b.paid_at ? ` · ${jst(b.paid_at)}` : ""}</dd></div>
              </dl>
            </article>
            <div className="flex flex-col gap-3 sm:flex-row">
              {b.pay_status !== "paid" && b.pay_status !== "pending" && <Link href={L("/consulting")} className="btn btn-teal btn-lg">{t("Book another time")}</Link>}
              <Link href={L("/account")} className="btn btn-outline btn-lg">{t("Your account")}</Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
