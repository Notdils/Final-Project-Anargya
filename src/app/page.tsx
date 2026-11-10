import Link from "next/link";
import { Ruler, Factory, Package } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/home/hero";
import { FlyThrough } from "@/components/home/fly-through";
import { Coverflow } from "@/components/coverflow";
import { listProducts } from "@/lib/catalog";

export const revalidate = 300;

const STEPS = [
  ["Design", "[PLACEHOLDER] Engineering scope from the business plan"],
  ["Validate", "[PLACEHOLDER] Simulation and track testing"],
  ["Partner production", "[PLACEHOLDER] Manufacturing partner model"],
  ["Supply", "[PLACEHOLDER] Parts sold through the marketplace"],
];

const VALUES = [
  [Ruler, "[PLACEHOLDER] Value 1"],
  [Factory, "[PLACEHOLDER] Value 2"],
  [Package, "[PLACEHOLDER] Value 3"],
] as const;

export default async function Home() {
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
            From the design table to the partner factory
          </h2>
          <div className="grid gap-6 md:gap-10 xl:grid-cols-[1.2fr_1fr]">
            <figure className="grid aspect-[4/3] place-items-center rounded-xl bg-surface-2 font-mono text-xs uppercase tracking-wider text-neutral-400 xl:aspect-auto xl:min-h-[480px]">
              Workshop photo [from Motion &amp; Videography]
            </figure>
            <div className="flex flex-col gap-4 md:gap-6">
              <ol className="flex flex-col gap-4 md:gap-6">
                {STEPS.map(([h, d]) => (
                  <li key={h} className="border-t border-teal pt-4 md:pt-6">
                    <h3 className="font-medium">{h}</h3>
                    <p className="text-sm text-muted">{d}</p>
                  </li>
                ))}
              </ol>
              <Link href="/marketplace" className="btn btn-outline self-stretch sm:self-start">Explore marketplace</Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="values-title" className="container-x pb-12 md:pb-24">
          <h2 id="values-title" className="mb-6 text-center text-[28px] font-semibold leading-9 tracking-[-0.02em] md:mb-10 md:text-4xl md:leading-[44px]">
            What we stand for
          </h2>
          <ul className="grid gap-4 md:gap-6 xl:grid-cols-3">
            {VALUES.map(([Icon, h]) => (
              <li key={h} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-tint text-teal">
                  <Icon size={24} strokeWidth={1.5} aria-hidden />
                </span>
                <h3 className="font-medium">{h}</h3>
                <p className="text-sm text-muted">Draft. Final values come from Creative Branding.</p>
              </li>
            ))}
          </ul>
        </section>

        <Coverflow products={featured} />

        <section aria-labelledby="cta-title" className="bg-surface py-12 md:py-24">
          <div className="container-x flex flex-col items-center gap-6 text-center">
            <h2 id="cta-title" className="text-2xl font-semibold tracking-[-0.02em] md:text-[32px] md:leading-10">
              Source parts for your next build.
            </h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/register" className="btn btn-ochre">Create an account</Link>
              <Link href="/marketplace" className="btn btn-outline">Browse marketplace</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
