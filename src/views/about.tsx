import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CapabilityTabs } from "@/components/capability-tabs";
import { PosterHero } from "@/components/about/poster-hero";
import { POSTER_BOOT } from "@/components/about/poster-boot";
import { lp, translator, type Locale } from "@/i18n";

const FLOW = [
  ["Design", "Concept, CAD, simulation"],
  ["Validate", "Testing and iteration"],
  ["Partner production", "Certified manufacturers"],
  ["Supply", "Sold via the marketplace"],
];

export default function AboutView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const L = (p: string) => lp(p, locale);
  return (
    <>
      <SiteHeader active="about" />
      <main id="main">
        <PosterHero />
        <script dangerouslySetInnerHTML={{ __html: POSTER_BOOT }} />

        <section aria-labelledby="story-title" className="container-x grid gap-4 py-12 md:grid-cols-[240px_1fr] md:gap-6 md:py-20 xl:grid-cols-[368px_1fr] xl:py-24">
          <div className="flex flex-col gap-3 md:sticky md:top-24 md:self-start">
            <p className="eyebrow text-teal">{t("Our story")}</p>
            <h2 id="story-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("Why we exist")}</h2>
          </div>
          <div className="flex max-w-[68ch] flex-col gap-6 text-[#404040] md:text-lg">
            <p>{t("Electric teams in Formula Student Japan almost doubled in four years, from 12 in 2022 to 23 in 2026. The cars keep getting harder to build: battery management, vehicle control, drivetrain and safety systems all have to work together, and many teams struggle with technical inspection, PCB design and documentation.")}</p>
            <p>{t("We design our components in-house and produce them with manufacturing partners. That lets us focus on engineering and quality, and sell four proven packages: uprights and wheel hubs, an aero package, a VCU and BMS unit, and a brake pedal box. Each comes with engineering consultation when a team needs it.")}</p>
            <p>{t("We start with Formula Student teams, then work with entry-level single-seater racing such as Japanese F4 and Formula Regional. In our fourth year we build a complete formula car prototype to show what we can do.")}</p>
          </div>
        </section>

        <section aria-label={t("Mission and vision")} className="bg-surface py-12 md:py-20">
          <div className="container-x grid gap-4 md:grid-cols-2 md:gap-6">
            {[["Mission", "Help Formula Student EV teams in Japan build reliable, inspection-ready cars with proven components and practical engineering support."], ["Vision", "Become a formula car developer for the Japanese market, from student competition to professional single-seaters."]].map(([k, v]) => (
              <article key={k} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6 md:p-8">
                <h2 className="eyebrow text-teal">{t(k)}</h2>
                <p className="text-xl font-medium leading-7 md:text-2xl md:leading-8">{t(v)}</p>
              </article>
            ))}
          </div>
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

        <section aria-labelledby="cta-title" className="bg-surface py-12 md:py-24">
          <div className="container-x flex flex-col items-center gap-6 text-center">
            <h2 id="cta-title" className="text-2xl font-semibold tracking-[-0.02em] md:text-[32px] md:leading-10">{t("See what we build.")}</h2>
            <Link href={L("/marketplace")} className="btn btn-teal w-full sm:w-auto">{t("Browse the marketplace")}</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
