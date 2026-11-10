import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, ShieldCheck, Truck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard, StockBadge } from "@/components/product";
import { PurchasePanel } from "@/components/purchase-panel";
import { DetailTabs } from "@/components/detail-tabs";
import { PartViewer } from "@/components/part-viewer";
import { getProduct, listProducts } from "@/lib/catalog";
import { categoryLabel } from "@/lib/data";
import { yen } from "@/lib/format";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await listProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return { title: p ? `${p.name} (${p.code})` : "Part not found" };
}

export default async function PartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, all] = await Promise.all([getProduct(slug), listProducts()]);
  if (!p) notFound();
  const related = all.filter((x) => x.id !== p.id && x.category === p.category).concat(all.filter((x) => x.id !== p.id && x.category !== p.category)).slice(0, 3);

  return (
    <>
      <SiteHeader active="marketplace" />
      <main id="main" className="pt-16">
        <nav aria-label="Breadcrumb" className="container-x py-4 md:py-6">
          <ol className="flex min-w-0 items-center gap-2 text-sm text-muted">
            <li><Link href="/marketplace" className="hover:text-ink">Marketplace</Link></li>
            <li className="flex shrink-0 items-center gap-2"><ChevronRight size={14} aria-hidden className="text-neutral-400" />{categoryLabel(p.category)}</li>
            <li aria-current="page" className="flex min-w-0 items-center gap-2 font-medium text-ink"><ChevronRight size={14} aria-hidden className="shrink-0 text-neutral-400" /><span className="truncate">{p.name}</span></li>
          </ol>
        </nav>

        <div className="container-x grid gap-6 pb-12 md:gap-8 md:pb-20 xl:grid-cols-[720px_1fr] xl:gap-12">
          <PartViewer name={p.name} code={p.code} modelUrl={p.modelUrl} />

          <section aria-labelledby="part-title" className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow text-muted">{p.code}</span>
                <StockBadge product={p} />
              </div>
              <h1 id="part-title" className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-4xl md:leading-[44px]">{p.name}</h1>
              <p className="font-mono text-xl font-medium md:text-2xl">{yen(p.priceJpy)}</p>
            </div>
            <p className="text-[#404040]">{p.description}</p>
            <PurchasePanel id={p.id} price={p.priceJpy} stock={p.stock} />
            <ul className="flex flex-col gap-3 border-t border-line pt-6 text-sm text-[#404040]">
              <li className="flex items-center gap-3"><Clock size={16} className="shrink-0 text-teal" aria-hidden />Lead time: {p.leadTime}</li>
              <li className="flex items-center gap-3"><Truck size={16} className="shrink-0 text-teal" aria-hidden />Ships from [CITY], Japan. Payment in IDR via Midtrans.</li>
              <li className="flex items-center gap-3"><ShieldCheck size={16} className="shrink-0 text-teal" aria-hidden />Built by a certified manufacturing partner.</li>
            </ul>
          </section>
        </div>

        <section aria-label="Part details" className="container-x pb-12 md:pb-20">
          <DetailTabs
            specs={[["Material", p.material], ["Weight", p.weight], ["Dimensions", p.dimensions], ["Fits", p.fits], ["Finish", p.finish], ["Lead time", p.leadTime]]}
            overview={p.description}
          />
        </section>

        {related.length > 0 && (
          <section aria-labelledby="rel-title" className="bg-surface py-12 md:py-20">
            <div className="container-x flex flex-col gap-6">
              <h2 id="rel-title" className="text-2xl font-semibold tracking-[-0.02em] md:text-[32px] md:leading-10">Related parts</h2>
              <ul className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 xl:grid-cols-3">
                {related.map((r) => <li key={r.id} className="w-[280px] shrink-0 snap-start md:w-auto"><ProductCard product={r} /></li>)}
              </ul>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
