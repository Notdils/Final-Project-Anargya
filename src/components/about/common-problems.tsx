import { ChevronDown, FileText } from "lucide-react";
import { translator, type Locale } from "@/i18n";

type Problem = { title: string; source: string; statement: string; evidence: string; intro?: string; points: string[] };

// Content from the team (13 Nov). Sources: competition rules and research (1), Tohoku University Formula Team,
// Student Formula Japan 2013 report (2, 3).
const PROBLEMS: Problem[] = [
  {
    title: "EV teams face complex battery and electrical safety requirements",
    source: "Supported by official regulations and research",
    statement: "Formula Student EV teams face complex electrical engineering requirements involving battery pack design, Battery Management Systems (BMS), electrical integration, insulation monitoring and high-voltage safety compliance.",
    evidence: "Why this matters",
    points: [
      "Battery systems require careful design and monitoring.",
      "Electrical systems must meet strict safety requirements.",
      "BMS and electrical integration introduce significant engineering complexity.",
      "Teams must pass dedicated electrical and battery inspections before competing.",
    ],
  },
  {
    title: "Mechanical integration can cause inspection failures",
    source: "Supported by a Japanese university case study",
    statement: "Mechanical integration challenges, including component clearance, suspension geometry, braking-system interference and insufficient structural rigidity, can result in technical inspection failures.",
    evidence: "Real-world evidence: Tohoku University Formula Team",
    intro: "In its 2013 Student Formula Japan report, Tohoku University documented approximately 15 mechanical inspection issues, including:",
    points: [
      "Insufficient clearance around the front tires.",
      "Steering rack and chassis interference.",
      "Insufficient brake pedal rigidity.",
      "Brake caliper interference with the wheel.",
      "Suspension fastener and torque-control issues.",
    ],
  },
  {
    title: "Poor component selection can cause vehicle redesign",
    source: "Directly documented case study",
    statement: "Late component selection and insufficient coordination between component specifications and vehicle architecture can lead to design incompatibilities, structural modifications, manufacturing delays and additional development work.",
    evidence: "Real-world evidence: Tohoku University Formula Team",
    intro: "The team reported that:",
    points: [
      "Major components, including the battery, steering and suspension systems, were selected too late.",
      "The chassis was designed before the steering and suspension layout was finalized.",
      "Some components were too large to fit in their intended positions.",
      "A change from a custom lithium-ion battery to a ready-made lead-acid battery introduced dimensional differences.",
      "The team had to modify parts of the frame and continued redesigning the battery container until the competition venue.",
    ],
  },
];

/** About: the problems teams run into most, as an accordion (native details/summary, works without JS). */
export function CommonProblems({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <section aria-labelledby="problems-title" className="bg-white py-12 md:py-20">
      <div className="container-x grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12">
        <div className="flex flex-col gap-3">
          <p className="eyebrow text-teal">{t("Why we exist")}</p>
          <h2 id="problems-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("Most common problems")}</h2>
          <p className="text-muted">{t("What Formula Student EV teams run into most, and what we help them avoid.")}</p>
        </div>
        <div className="border-t border-line">
          {PROBLEMS.map((p, i) => (
            <details key={p.title} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 transition-colors hover:text-teal hover:[&>svg]:text-teal [&::-webkit-details-marker]:hidden">
                <span className="flex gap-4">
                  <span className="font-mono text-sm leading-6 text-teal">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-medium leading-6">{t(p.title)}</span>
                </span>
                <ChevronDown size={18} aria-hidden className="mt-0.5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="flex flex-col gap-4 pb-6 pl-9">
                <p className="flex w-fit items-center gap-1.5 rounded-full bg-ochre-tint px-2.5 py-1 text-xs font-medium"><FileText size={12} aria-hidden />{t(p.source)}</p>
                <div className="flex flex-col gap-1">
                  <h3 className="eyebrow text-muted">{t("Problem statement")}</h3>
                  <p>{t(p.statement)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="eyebrow text-muted">{t(p.evidence)}</h3>
                  {p.intro && <p className="text-muted">{t(p.intro)}</p>}
                  <ul className="flex flex-col gap-1.5">
                    {p.points.map((x) => (
                      <li key={x} className="flex gap-2 text-muted"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />{t(x)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
