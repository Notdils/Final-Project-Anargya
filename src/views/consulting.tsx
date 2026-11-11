import { SiteHeader } from "@/components/site-header";
import { SlimFooter } from "@/components/site-footer";
import { BookingForm } from "@/components/booking-form";
import { consultFeeUsd, fxUsdIdr, hasSupabase, MIDTRANS_CLIENT_KEY, MIDTRANS_SNAP_JS } from "@/lib/env";
import { translator, type Locale } from "@/i18n";

// One screen: free slots, details and Midtrans payment. Fee and rate come from env at build time.
export default function ConsultingView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const fee = consultFeeUsd();
  const fx = fxUsdIdr();
  const ready = hasSupabase && Boolean(MIDTRANS_CLIENT_KEY && process.env.MIDTRANS_SERVER_KEY) && fx !== null;
  return (
    <>
      <SiteHeader active="consulting" />
      <main id="main" className="flex min-h-svh flex-col bg-surface pt-16">
        <section aria-labelledby="c-title" className="container-x flex flex-1 flex-col gap-4 py-6 md:gap-6 md:py-8">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-6">
            <div>
              <p className="eyebrow text-teal">{t("Consulting")}</p>
              <h1 id="c-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("Book a consultation")}</h1>
            </div>
            <p className="max-w-[520px] text-sm text-muted">{t("30-minute video call with our engineers on concept, aero, EV powertrain or chassis. Times are in Japan time (JST).")}</p>
          </div>
          <BookingForm feeUsd={fee} fx={fx} ready={ready} snapJs={MIDTRANS_SNAP_JS} clientKey={MIDTRANS_CLIENT_KEY} />
        </section>
      </main>
      <SlimFooter />
    </>
  );
}
