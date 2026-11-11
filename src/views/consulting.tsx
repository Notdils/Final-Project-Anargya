import { CarFront, CircleDot, Wind, Zap } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingForm } from "@/components/booking-form";
import { translator, type Locale } from "@/i18n";


const SERVICES = [
  { Icon: CarFront, t: "Vehicle concept & packaging", d: "Target setting, layout and packaging of a formula EV from first sketch to design freeze." },
  { Icon: Wind, t: "Aerodynamics & composites", d: "Wing, diffuser and bodywork concepts, CFD review and composite layup planning." },
  { Icon: Zap, t: "EV powertrain & electronics", d: "Accumulator, motor controller, VCU and BMS architecture, wiring and safety systems." },
  { Icon: CircleDot, t: "Chassis, suspension & brakes", d: "Frame and suspension geometry, uprights, pedal box and brake system sizing." },
];
const STEPS = [
  ["Book a call", "Pick a topic and a time. 30 minutes, online."],
  ["Scoping", "We map your goals, constraints and timeline."],
  ["Proposal", "A fixed scope and quote within [PLACEHOLDER] working days."],
  ["Delivery", "Reviews, files and hand-over with your team."],
];

export default function ConsultingView({ locale }: { locale: Locale }) {
  const tr = translator(locale);
  return (
    <>
      <SiteHeader variant="overlay" active="consulting" />
      <main id="main">
        <section aria-labelledby="c-title" className="bg-stage pb-12 pt-28 text-white md:pb-20 md:pt-36">
          <div className="container-x flex flex-col gap-4 md:gap-6">
            <p className="eyebrow text-neutral-400">{tr("Consulting")}</p>
            <h1 id="c-title" className="max-w-[760px] text-[32px] font-semibold leading-10 tracking-[-0.03em] md:text-[56px] md:leading-[60px]">
              {tr("Engineering consulting for formula EV teams")}
            </h1>
            <p className="max-w-[640px] text-neutral-300 md:text-lg">
              {tr("[PLACEHOLDER] One or two sentences: who we help (student teams, startups, manufacturers) and what they get from working with the people who design our parts.")}
            </p>
            <a href="#book" className="btn btn-teal w-fit">{tr("Book a consultation")}</a>
          </div>
        </section>

        <section aria-labelledby="svc-title" className="container-x flex flex-col gap-6 py-12 md:gap-8 md:py-24 md:pb-12">
          <h2 id="svc-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{tr("What we help with")}</h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SERVICES.map(({ Icon, t, d }) => (
              <li key={t} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
                <Icon size={20} className="text-teal" aria-hidden />
                <h3 className="font-medium">{tr(t)}</h3>
                <p className="text-sm text-muted">{tr(d)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-title" className="container-x flex flex-col gap-6 pb-12 md:gap-8 md:pb-24">
          <h2 id="how-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{tr("How it works")}</h2>
          <ol className="grid gap-4 md:grid-cols-4 md:gap-6">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-1 border-t border-teal pt-4">
                <span className="font-mono text-xs text-teal">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-medium">{tr(t)}</h3>
                <p className="text-sm text-muted">{tr(d)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="book" aria-labelledby="book-title" className="scroll-mt-16 bg-surface py-12 md:py-24">
          <div className="container-x grid gap-6 xl:grid-cols-[360px_1fr] xl:gap-16">
            <div className="flex flex-col gap-3">
              <p className="eyebrow text-teal">{tr("Book a consultation")}</p>
              <h2 id="book-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{tr("Pick a topic and a time")}</h2>
              <p className="text-muted">{tr("30-minute video call. Times are in Japan time (JST). We confirm by email within one working day.")}</p>
            </div>
            <BookingForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
