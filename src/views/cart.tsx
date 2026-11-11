import { SiteHeader } from "@/components/site-header";
import { SlimFooter } from "@/components/site-footer";
import { CheckoutSteps } from "@/components/checkout-steps";
import { CartView } from "@/components/cart-view";
import { listProducts } from "@/lib/catalog";
import { translator, type Locale } from "@/i18n";


export default async function CartView_({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const products = await listProducts();
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[70vh] pt-16">
        <div className="container-x py-6 md:py-10">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-[40px] md:leading-[48px]">{t("Cart")}</h1>
          <CheckoutSteps active={0} />
        </div>
        <CartView products={products} />
      </main>
      <SlimFooter />
    </>
  );
}
