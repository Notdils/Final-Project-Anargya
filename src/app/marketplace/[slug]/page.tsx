import type { Metadata } from "next";
import View from "@/views/part";
import { getProduct, listProducts } from "@/lib/catalog";
import { translator } from "@/i18n";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await listProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return { title: p ? `${p.name} (${p.code})` : translator("en")("Part not found") };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <View slug={(await params).slug} locale="en" />;
}
