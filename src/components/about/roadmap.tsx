import { translator, type Locale } from "@/i18n";

// Five-year plan on the About page: one static section, no scroll effects.
// From md up the five years sit in one row on a horizontal line; on phones they stack on a vertical
// line (five columns do not fit 375px without sideways scrolling).
const STEPS = [
  ["Establishment", "Research and development of four EV modules (VCU/BMS, aero, uprights, pedal box), validated through field testing."],
  ["Market entry", "Component packages launch in Japan, with demos for Formula Student teams and our consulting service."],
  ["Expansion", "More teams as customers, full engineering consulting, and preparation for a complete car."],
  ["Diversification", "A complete formula car prototype, built with a manufacturing partner."],
  ["Consolidation", "Small-series formula car production and a base of returning customers."],
] as const;

export function Roadmap({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <section aria-labelledby="plan-title" className="container-x flex flex-col gap-8 py-12 md:gap-12 md:py-20">
      <div className="flex flex-col gap-2">
        <p className="eyebrow text-muted">{t("Our five-year plan")}</p>
        <h2 id="plan-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">
          {t("From four parts to a full car.")}
        </h2>
      </div>
      <ol className="grid md:grid-cols-5">
        {STEPS.map(([stage, desc], i) => (
          <li key={stage} className="group relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0 md:flex md:flex-col md:gap-5 md:pb-0">
            {/* one line from the first dot to the last: vertical on phones, horizontal from md */}
            <span aria-hidden className="absolute bottom-0 left-[11px] top-0 w-0.5 bg-neutral-200 group-first:top-4 group-last:bottom-auto group-last:h-4 md:hidden" />
            <span aria-hidden className="absolute inset-x-0 top-[11px] hidden h-0.5 bg-neutral-200 group-first:left-3 group-last:right-auto group-last:w-3 md:block" />
            <span aria-hidden className="relative z-10 mt-1 size-6 rounded-full border-[6px] border-teal bg-white md:mt-0" />
            <div className="flex flex-col gap-2 md:pr-6">
              <p className="eyebrow text-teal">{t(stage)}</p>
              <h3 className="text-2xl font-semibold leading-8 tracking-[-0.02em]">{t(`Year ${i + 1}`)}</h3>
              <p className="text-[15px] leading-6 text-muted">{t(desc)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
