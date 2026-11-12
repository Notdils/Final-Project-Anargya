import Link from "next/link";
import { Ruler, Factory, Package } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/home/hero";
import { Preloader } from "@/components/home/preloader";
import { PRELOADER_BOOT } from "@/components/home/preloader-boot";
import { FlyThrough } from "@/components/home/fly-through";
import { Roadmap } from "@/components/home/roadmap";
import { Coverflow } from "@/components/coverflow";
import { listProducts } from "@/lib/catalog";
import { GuestOnly } from "@/components/auth-state";
import { lp, translator, type Locale } from "@/i18n";


// Five-year roadmap from the SPD (business plan), paraphrased.
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
      <script dangerouslySetInnerHTML={{ __html: PRELOADER_BOOT }} />
      <noscript>
        <style>{".preloader{display:none}"}</style>
      </noscript>
      <Preloader />
      <SiteHeader variant="overlay" active="home" />
      <main id="main">
        <Hero />
        <FlyThrough />

        <section aria-labelledby="how-title" className="pt-12 md:pt-24">
          <div className="container-x mx-auto flex max-w-[640px] flex-col items-center gap-2 text-center">
            <p className="eyebrow text-muted">{t("Our five-year plan")}</p>
            <h2 id="how-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">
              {t("From four parts to a full car.")}
            </h2>
          </div>
          <Roadmap />
          <div className="container-x flex flex-col justify-center gap-3 pb-12 sm:flex-row md:pb-24">
            <Link href={L("/marketplace")} className="btn btn-outline">{t("Explore marketplace")}</Link>
            <Link href={L("/consulting")} className="btn btn-outline">{t("Book a consultation")}</Link>
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
