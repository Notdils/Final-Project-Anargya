"use client";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { categoryLabel, isLowStock, type Product } from "@/lib/data";
import Image from "next/image";
import { Price } from "./price";
import { useLp, useT } from "@/i18n/client";

export function StockBadge({ product, dark = false }: { product: Pick<Product, "stock">; dark?: boolean }) {
  const t = useT();
  if (product.stock <= 0)
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-muted">
        {t("Out of stock")}
      </span>
    );
  if (isLowStock(product))
    return (
      <span
        className={`inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
          dark ? "bg-oxide text-white" : "bg-oxide-tint text-oxide"
        }`}
      >
        <AlertTriangle size={12} strokeWidth={2} aria-hidden />
        {t("Low stock · {n} left", { n: product.stock })}
      </span>
    );
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded bg-teal-tint px-1.5 py-0.5 text-xs font-medium text-teal">
      <Check size={12} strokeWidth={2} aria-hidden />
      {t("In stock")}
    </span>
  );
}

/** Placeholder until per-part 3D renders exist (product.modelUrl). */
export function PartRender({ dark = false, label = "Part render", image, alt = "", priority = false }: { dark?: boolean; label?: string; image?: string | null; alt?: string; priority?: boolean }) {
  if (image)
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-white">
        <Image src={image} alt={alt} fill sizes="(min-width: 1280px) 480px, (min-width: 768px) 50vw, 100vw" className="object-contain p-2" priority={priority} />
      </div>
    );
  return (
    <div
      className={`grid h-full w-full place-items-center rounded-lg border border-dashed font-mono text-xs uppercase tracking-wider ${
        dark ? "border-stage-line text-neutral-400" : "border-transparent bg-surface-2 text-neutral-500"
      }`}
    >
      {label}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const t = useT();
  const L = useLp();
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[4/3]">
        <PartRender image={product.image} alt={t("Preliminary 3D draft of the {name}", { name: product.name })} />
        <div className="absolute left-3 top-3">
          <StockBadge product={product} />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="eyebrow text-muted">{t(categoryLabel(product.category))}</p>
        <h3 className="font-medium">
          <Link href={L(`/marketplace/${product.slug}`)} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center justify-between">
          <Price usd={product.priceUsd} className="text-sm" />
          <span className="text-sm font-medium text-teal group-hover:underline">{t("View")}</span>
        </div>
      </div>
    </article>
  );
}
