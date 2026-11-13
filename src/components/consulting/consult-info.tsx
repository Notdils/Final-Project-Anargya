import { ChevronDown } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import { translator, type Locale } from "@/i18n";

// Below the booking form: what a session covers, common questions, and a way back up to the form.
// Answers only state what the booking flow already does (90 min, JST slots, 15-minute hold, IDR via
// Midtrans, link by email). Reschedule/refund rules are not set yet, so that answer points to email.
const COVERS = [
  ["Technical inspection readiness", "Go through your car against the inspection checklist and find what is likely to fail before the event."],
  ["Electrical systems & PCB design", "Review schematics, harness layout and PCB design for safety, noise and reliability."],
  ["EV powertrain, VCU & BMS", "Motor, inverter and accumulator integration, VCU logic and BMS configuration."],
  ["Documentation & rules compliance", "Check required documents and design reports against the current rules."],
  ["Design review & part modifications", "Feedback on your CAD, and on fitting our parts to your car."],
] as const;

export function ConsultInfo({ locale, feeUsd }: { locale: Locale; feeUsd: number | null }) {
  const t = translator(locale);
  const fee = feeUsd !== null ? `$${feeUsd.toLocaleString("en-US")}` : null;
  const faq: [string, string][] = [
    ["Who is a consultation for?", t("Formula Student EV teams, new or experienced, and their faculty advisors.")],
    [
      "How much does it cost?",
      fee ? t("{fee} per 90-minute session, paid when you book. Midtrans charges the IDR equivalent.", { fee }) : t("The fee is shown in the booking summary before you pay."),
    ],
    ["What should I prepare?", t("Your questions, plus anything that helps us see the problem: CAD screenshots, schematics, the rule you are unsure about, or photos of the part.")],
    ["Which time zone are the slots in?", t("Slots are set in Japan time (JST, UTC+9). The form also shows each slot in your own time zone.")],
    ["What happens after I pay?", t("Your booking is confirmed and appears in your account. We email the meetup/call details to the address you gave before the session.")],
    ["What if I do not finish paying?", t("Your slot is held for 15 minutes while you pay. If payment is not completed, the slot is released for others.")],
    ["Can I reschedule or cancel?", t("Email us at {email} with your booking details and we will help.", { email: CONTACT.email })],
  ];

  return (
    <>
      <section aria-labelledby="covers-title" className="bg-white py-12 md:py-20">
        <div className="container-x flex flex-col gap-8 md:gap-10">
          <div className="flex max-w-[640px] flex-col gap-3">
            <p className="eyebrow text-teal">{t("What it covers")}</p>
            <h2 id="covers-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("What your consultation covers")}</h2>
            <p className="text-muted">{t("One 90-minute meetup/call with an engineer, focused on the topic you choose when you book.")}</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {COVERS.map(([h, d], i) => (
              <li key={h} className="flex flex-col gap-2 rounded-xl border border-line p-5 md:p-6">
                <span className="font-mono text-xs text-teal">0{i + 1}</span>
                <h3 className="font-medium">{t(h)}</h3>
                <p className="text-sm text-muted">{t(d)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="py-12 md:py-20">
        <div className="container-x grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12">
          <div className="flex flex-col gap-3">
            <h2 id="faq-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{t("Consultation questions")}</h2>
            <p className="text-muted">{t("Anything else? Ask us during the call.")}</p>
          </div>
          <div className="border-t border-line">
            {faq.map(([q, a]) => (
              <details key={q} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium transition-colors hover:text-teal hover:[&>svg]:text-teal [&::-webkit-details-marker]:hidden">
                  {t(q)}
                  <ChevronDown size={18} aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <p className="pb-5 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="book-cta-title" className="bg-white py-12 md:py-20">
        <div className="container-x flex flex-col items-center gap-4 text-center">
          <h2 id="book-cta-title" className="text-2xl font-semibold tracking-[-0.02em] md:text-[32px] md:leading-10">{t("Ready to talk it through?")}</h2>
          <p className="text-muted">{t("Pick a time that suits your team.")}</p>
          <a href="#book" className="btn btn-teal btn-lg w-full sm:w-auto">{t("Choose a time")}</a>
        </div>
      </section>
    </>
  );
}
