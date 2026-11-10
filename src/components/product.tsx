import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { categoryLabel, isLowStock, type Product } from "@/lib/data";
import { yen } from "@/lib/format";

export function StockBadge({ product, dark = false }: { product: Pick<Product, "stock">; dark?: boolean }) {
  if (product.stock <= 0)
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-muted">
        Out of stock
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
        Low stock · {product.stock} left
      </span>
    );
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded bg-teal-tint px-1.5 py-0.5 text-xs font-medium text-teal">
      <Check size={12} strokeWidth={2} aria-hidden />
      In stock
    </span>
  );
}

/** Placeholder until per-part 3D renders exist (product.modelUrl). */
export function PartRender({ dark = false, label = "Part render" }: { dark?: boolean; label?: string }) {
  return (
    <div
      className={`grid h-full w-full place-items-center rounded-lg border border-dashed font-mono text-xs uppercase tracking-wider ${
        dark ? "border-stage-line text-neutral-600" : "border-transparent bg-surface-2 text-neutral-400"
      }`}
    >
      {label}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[4/3]">
        <PartRender />
        <div className="absolute left-3 top-3">
          <StockBadge product={product} />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="eyebrow text-muted">{categoryLabel(product.category)}</p>
        <h3 className="font-medium">
          <Link href={`/marketplace/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm">{yen(product.priceJpy)}</span>
          <span className="text-sm font-medium text-teal group-hover:underline">View</span>
        </div>
      </div>
    </article>
  );
}
