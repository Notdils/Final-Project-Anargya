import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingForm } from "@/components/booking-form";
import { ConsultInfo } from "@/components/consulting/consult-info";
import { SupportChat } from "@/components/consulting/support-chat";
import { consultFeeUsd, fxUsdIdr, hasSupabase, MIDTRANS_CLIENT_KEY, MIDTRANS_SNAP_JS } from "@/lib/env";
import { translator, type Locale } from "@/i18n";

// First screen: customer service chat card, then booking in three steps (slot, details, Midtrans payment); below it what a session covers, FAQ and a CTA back up. Fee and rate come from env at build time.
export default function ConsultingView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const fee = consultFeeUsd();
  const fx = fxUsdIdr();
  const ready = hasSupabase && Boolean(MIDTRANS_CLIENT_KEY && process.env.MIDTRANS_SERVER_KEY) && fx !== null;
  return (
    <>
      <SiteHeader active="consulting" />
      <main id="main" className="flex min-h-svh flex-col bg-surface pt-16">
        <section id="book" aria-labelledby="c-title" className="container-x flex flex-1 scroll-mt-16 flex-col gap-4 py-6 md:gap-6 md:py-8">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-6">
            <div>
              <p className="eyebrow text-teal">{t("Consulting")}</p>
              <h1 id="c-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("Book a consultation")}</h1>
            </div>
            <p className="max-w-[520px] text-sm text-muted">{t("90-minute meetup/call with our engineers: inspection readiness, electrical and PCB, EV powertrain, documentation or design review. Times are in Japan time (JST, UTC+9).")}</p>
          </div>
          <div className="flex w-full max-w-[880px] flex-col gap-4 md:gap-6">
            <SupportChat />
            <BookingForm feeUsd={fee} fx={fx} ready={ready} snapJs={MIDTRANS_SNAP_JS} clientKey={MIDTRANS_CLIENT_KEY} />
          </div>
        </section>
        <ConsultInfo locale={locale} feeUsd={fee} />
      </main>
      <SiteFooter />
    </>
  );
}
