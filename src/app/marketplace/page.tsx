import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Coverflow } from "@/components/coverflow";
import { MarketplaceGrid } from "@/components/marketplace-grid";
import { listProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Marketplace" };
export const revalidate = 300;

export default async function Marketplace() {
  const products = await listProducts();
  return (
    <>
      <SiteHeader active="marketplace" />
      <main id="main" className="pt-16">
        <Coverflow products={products.filter((p) => p.featured)} />
        <section aria-labelledby="all-title" className="container-x py-8 md:py-12">
          <h1 id="all-title" className="text-[32px] font-semibold leading-10 tracking-[-0.03em] md:text-5xl md:leading-[56px]">All parts</h1>
          <p className="mt-3 text-muted">[PLACEHOLDER] One line on what is sold here and who builds it.</p>
          <MarketplaceGrid products={products} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
