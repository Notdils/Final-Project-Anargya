import Link from "next/link";
import { Ruler, Factory, Package } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/home/hero";
import { FlyThrough } from "@/components/home/fly-through";
import { Coverflow } from "@/components/coverflow";
import { listProducts } from "@/lib/catalog";
import { GuestOnly } from "@/components/auth-state";
import { lp, translator, type Locale } from "@/i18n";


// Five-year roadmap from the SPD (business plan), paraphrased.
const STEPS = [
  ["Year 1 · Establishment", "Research and development of four EV modules (VCU/BMS, aero, uprights, pedal box), validated through field testing."],
  ["Year 2 · Market entry", "Component packages launch in Japan, with demos for Formula Student teams and our consulting service."],
  ["Year 3 · Expansion", "More teams as customers, full engineering consulting, and preparation for a complete car."],
  ["Year 4 · Diversification", "A complete formula car prototype, built with a manufacturing partner."],
  ["Year 5 · Consolidation", "Small-series formula car production and a base of returning customers."],
];

const VALUES = [
  [Ruler, "[PLACEHOLDER] Value 1"],
  [Factory, "[PLACEHOLDER] Value 2"],
  [Package, "[PLACEHOLDER] Value 3"],
] as const;

export default async function HomeView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const L = (p: string) => lp(p, locale);
  const products = await listProducts();
  const featured = products.filter((p) => p.featured);

  return (
    <>
      <SiteHeader variant="overlay" active="home" />
      <main id="main">
        <Hero />
        <FlyThrough />

        <section aria-labelledby="how-title" className="container-x py-12 md:py-24">
          <h2 id="how-title" className="mx-auto mb-8 max-w-[640px] text-center text-[28px] font-semibold leading-9 tracking-[-0.02em] md:mb-12 md:text-4xl md:leading-[44px]">
            {t("Our five-year plan")}
          </h2>
          <div className="grid gap-6 md:gap-10 xl:grid-cols-[1.2fr_1fr]">
            {/* Slot for the launch poster from Graphic Design: the corporation, parts distribution, consulting, expansion. Portrait 4:5. */}
            <figure className="mx-auto grid aspect-[4/5] w-full max-w-[560px] place-items-center rounded-xl bg-surface-2 p-6 text-center font-mono text-xs uppercase tracking-wider text-neutral-500">
              {t("Launch poster [from Graphic Design]")}
            </figure>
            <div className="flex flex-col gap-4 md:gap-6">
              <ol className="flex flex-col gap-4 md:gap-6">
                {STEPS.map(([h, d]) => (
                  <li key={h} className="border-t border-teal pt-4 md:pt-6">
                    <h3 className="font-medium">{t(h)}</h3>
                    <p className="text-sm text-muted">{t(d)}</p>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={L("/marketplace")} className="btn btn-outline">{t("Explore marketplace")}</Link>
                <Link href={L("/consulting")} className="btn btn-outline">{t("Book a consultation")}</Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="values-title" className="container-x pb-12 md:pb-24">
          <h2 id="values-title" className="mb-6 text-center text-[28px] font-semibold leading-9 tracking-[-0.02em] md:mb-10 md:text-4xl md:leading-[44px]">
            {t("What we stand for")}
          </h2>
          <ul className="grid gap-4 md:gap-6 xl:grid-cols-3">
            {VALUES.map(([Icon, h]) => (
              <li key={h} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-tint text-teal">
                  <Icon size={24} strokeWidth={1.5} aria-hidden />
                </span>
                <h3 className="font-medium">{t(h)}</h3>
                <p className="text-sm text-muted">{t("Draft. Final values come from Creative Branding.")}</p>
              </li>
            ))}
          </ul>
        </section>

        <Coverflow products={featured} />

        <section aria-labelledby="cta-title" className="bg-surface py-12 md:py-24">
          <div className="container-x flex flex-col items-center gap-6 text-center">
            <h2 id="cta-title" className="text-2xl font-semibold tracking-[-0.02em] md:text-[32px] md:leading-10">
              {t("Start with the marketplace.")}
            </h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <GuestOnly><Link href={L("/register")} className="btn btn-teal">{t("Create an account")}</Link></GuestOnly>
              <Link href={L("/marketplace")} className="btn btn-outline">{t("Browse marketplace")}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
