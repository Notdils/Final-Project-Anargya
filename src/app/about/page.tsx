import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CapabilityTabs } from "@/components/capability-tabs";

export const metadata: Metadata = { title: "About" };

const FLOW = [
  ["Design", "Concept, CAD, simulation"],
  ["Validate", "Testing and iteration"],
  ["Partner production", "Certified manufacturers"],
  ["Supply", "Sold via the marketplace"],
];

export default function About() {
  return (
    <>
      <SiteHeader variant="overlay" active="about" />
      <main id="main">
        <section aria-labelledby="about-title" className="bg-stage pb-12 pt-28 text-white md:pb-20 md:pt-32">
          <div className="container-x flex flex-col gap-12 md:gap-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
              <div className="flex flex-col gap-4">
                <p className="eyebrow text-neutral-400">About Anargya</p>
                <h1 id="about-title" className="text-[40px] font-semibold leading-[44px] tracking-[-0.03em] md:text-[56px] md:leading-[56px] xl:text-[80px] xl:leading-[80px]">
                  Engineering-led.
                  <br />
                  Partner-built.
                </h1>
              </div>
              <p className="max-w-[360px] text-neutral-400 md:text-lg">
                [PLACEHOLDER] One sentence positioning: a Japan-based design house for electric formula vehicles and their systems.
              </p>
            </div>
            <figure className="grid h-[280px] place-items-center rounded-xl bg-[#171717] font-mono text-xs uppercase tracking-wider text-neutral-400 md:h-[440px] xl:h-[560px]">
              Studio / workshop photo
            </figure>
          </div>
        </section>

        <section aria-labelledby="story-title" className="container-x grid gap-4 py-12 md:grid-cols-[240px_1fr] md:gap-6 md:py-20 xl:grid-cols-[368px_1fr] xl:py-24">
          <div className="flex flex-col gap-3 md:sticky md:top-24 md:self-start">
            <p className="eyebrow text-teal">Our story</p>
            <h2 id="story-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">Why we exist</h2>
          </div>
          <div className="flex flex-col gap-6 text-[#404040] md:text-lg">
            <p>[PLACEHOLDER] Paragraph 1: the problem we saw in electric performance vehicles and why design and production should be separated.</p>
            <p>[PLACEHOLDER] Paragraph 2: why Japan, and how working with certified vehicle manufacturers lets us focus on engineering.</p>
            <p>[PLACEHOLDER] Paragraph 3: where we are heading. Final copy from Creative Branding.</p>
          </div>
        </section>

        <section aria-label="Mission and vision" className="bg-surface py-12 md:py-20">
          <div className="container-x grid gap-4 md:grid-cols-2 md:gap-6">
            {[["Mission", "[PLACEHOLDER] Mission statement, one or two sentences."], ["Vision", "[PLACEHOLDER] Vision statement, one or two sentences."]].map(([k, v]) => (
              <article key={k} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6 md:p-8">
                <h2 className="eyebrow text-teal">{k}</h2>
                <p className="text-xl font-medium leading-7 md:text-2xl md:leading-8">{v}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="model-title" className="container-x flex flex-col gap-6 py-12 md:gap-10 md:py-20">
          <div className="flex flex-col gap-3">
            <p className="eyebrow text-teal">Business model</p>
            <h2 id="model-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">How a part reaches you</h2>
            <p className="text-muted">[PLACEHOLDER] Summary from the business plan.</p>
          </div>
          <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            {FLOW.map(([h, s], k) => (
              <li key={h} className="contents">
                <div className="flex flex-1 flex-col gap-2 rounded-xl border border-line p-5">
                  <h3 className="font-medium">{h}</h3>
                  <p className="text-sm text-muted">{s}</p>
                </div>
                {k < FLOW.length - 1 && <ArrowRight aria-hidden size={20} className="mx-auto shrink-0 rotate-90 text-teal md:rotate-0" />}
              </li>
            ))}
          </ol>
          <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
            {["Target market", "Revenue streams", "Partner requirements"].map((k) => (
              <li key={k} className="flex flex-col gap-2 rounded-xl border border-dashed border-line bg-surface p-5">
                <h3 className="eyebrow">{k}</h3>
                <p className="text-sm text-muted">[PLACEHOLDER] From the business plan.</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cap-title" className="container-x flex flex-col gap-6 pb-12 md:gap-8 md:pb-20">
          <div className="flex flex-col gap-3">
            <p className="eyebrow text-teal">Capabilities</p>
            <h2 id="cap-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">Three disciplines, one vehicle</h2>
          </div>
          <CapabilityTabs />
        </section>

        <section aria-labelledby="cta-title" className="bg-surface py-12 md:py-24">
          <div className="container-x flex flex-col items-center gap-6 text-center">
            <h2 id="cta-title" className="text-2xl font-semibold tracking-[-0.02em] md:text-[32px] md:leading-10">See what we build.</h2>
            <Link href="/marketplace" className="btn btn-ochre w-full sm:w-auto">Browse the marketplace</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
