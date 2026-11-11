import { SiteHeader } from "@/components/site-header";
import { SlimFooter } from "@/components/site-footer";
import { CheckoutSteps } from "@/components/checkout-steps";
import { CheckoutForm } from "@/components/checkout-form";
import { listProducts } from "@/lib/catalog";
import { currentUser } from "@/lib/supabase/server";
import { fxUsdIdr, hasSupabase, MIDTRANS_CLIENT_KEY, MIDTRANS_SNAP_JS } from "@/lib/env";
import { shippingData } from "@/lib/shipping-server";
import { hasMidtrans } from "@/lib/midtrans";
import { lastAddress } from "@/lib/orders";
import { translator, type Locale } from "@/i18n";


export default async function CheckoutView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [products, { user }, saved, shipping] = await Promise.all([listProducts(), currentUser(), lastAddress(), shippingData()]);
  const fx = fxUsdIdr();
  const ready = hasSupabase && hasMidtrans() && fx !== null;
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[70vh] pt-16">
        <div className="container-x py-6 md:py-10">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-[40px] md:leading-[48px]">{t("Checkout")}</h1>
          <CheckoutSteps active={2} />
        </div>
        <CheckoutForm
          products={products}
          email={user?.email ?? ""}
          saved={saved}
          fx={fx}
          shipping={shipping}
          ready={ready}
          snapJs={MIDTRANS_SNAP_JS}
          clientKey={MIDTRANS_CLIENT_KEY}
        />
      </main>
      <SlimFooter />
    </>
  );
}
