import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Coverflow } from "@/components/coverflow";
import { MarketplaceGrid } from "@/components/marketplace-grid";
import { CapabilityTabs } from "@/components/capability-tabs";
import { listProducts } from "@/lib/catalog";
import { translator, type Locale } from "@/i18n";


// Moved from About (13 Nov): how a part reaches the customer, and the capabilities behind it.
const FLOW = [
  ["Design", "Concept, CAD, simulation"],
  ["Validate", "Testing and iteration"],
  ["Partner production", "Certified manufacturers"],
  ["Supply", "Sold via the marketplace"],
];

export default async function MarketplaceView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const products = await listProducts();
  return (
    <>
      <SiteHeader active="marketplace" />
      <main id="main" className="pt-16">
        <Coverflow products={products.filter((p) => p.featured)} />
        <section aria-labelledby="all-title" className="container-x py-8 md:py-12">
          <h1 id="all-title" className="text-[32px] font-semibold leading-10 tracking-[-0.03em] md:text-5xl md:leading-[56px]">{t("All parts")}</h1>
          <p className="mt-3 text-muted">{t("Formula EV components we design in-house and build with certified manufacturing partners.")}</p>
          <MarketplaceGrid products={products} />
        </section>

        <section aria-labelledby="model-title" className="container-x flex flex-col gap-6 py-12 md:gap-10 md:py-20">
          <div className="flex flex-col gap-3">
            <p className="eyebrow text-teal">{t("Business model")}</p>
            <h2 id="model-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("How a part reaches you")}</h2>
            <p className="text-muted">{t("We sell components and engineering consultation. Parts are designed by us and made by manufacturing partners.")}</p>
          </div>
          <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            {FLOW.map(([h, s], k) => (
              <li key={h} className="contents">
                <div className="flex flex-1 flex-col gap-2 rounded-xl border border-line p-5">
                  <h3 className="font-medium">{t(h)}</h3>
                  <p className="text-sm text-muted">{t(s)}</p>
                </div>
                {k < FLOW.length - 1 && <ArrowRight aria-hidden size={20} className="mx-auto shrink-0 rotate-90 text-teal md:rotate-0" />}
              </li>
            ))}
          </ol>
          <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
            {[
              ["Target market", "Formula Student EV teams in Japan, mainly new and mid-field teams. Faculty advisors and university procurement make the purchase."],
              ["Revenue streams", "Component sales through this marketplace and paid engineering consultation. A complete formula car follows later."],
              ["Partner requirements", "A clear project scope, measurable technical goals, safety and quality procedures, transparent documentation and protection of intellectual property."],
            ].map(([k, v]) => (
              <li key={k} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
                <h3 className="eyebrow">{t(k)}</h3>
                <p className="text-sm text-muted">{t(v)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cap-title" className="container-x flex flex-col gap-6 pb-12 md:gap-8 md:pb-20">
          <div className="flex flex-col gap-3">
            <p className="eyebrow text-teal">{t("Capabilities")}</p>
            <h2 id="cap-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("Three disciplines, one vehicle")}</h2>
          </div>
          <CapabilityTabs />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
