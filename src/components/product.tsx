"use client";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { categoryLabel, isLowStock, type Product } from "@/lib/data";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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

const PartScene = dynamic(() => import("./part-scene"), { ssr: false });

/** True once the element is near the viewport; false again when it scrolls away (pauses the canvas). */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

/**
 * Part thumbnail. With a 3D model: the render image shows first, then the model fades in once it is
 * near the viewport. It turns while `spin` is on (hover in the grid, the centred coverflow card).
 */
export function PartRender({ dark = false, label = "Part render", image, model, spin = false, alt = "", priority = false }: { dark?: boolean; label?: string; image?: string | null; model?: string | null; spin?: boolean; alt?: string; priority?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [gl, setGl] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setGl(Boolean(c.getContext("webgl2") || c.getContext("webgl")) && !matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch { setGl(false); }
  }, []);
  const live = Boolean(model) && gl;
  if (image || live)
    return (
      <div ref={ref} className="relative h-full w-full overflow-hidden rounded-lg bg-white" role={live ? "img" : undefined} aria-label={live ? alt : undefined}>
        {image && <Image src={image} alt={live ? "" : alt} fill sizes="(min-width: 1280px) 480px, (min-width: 768px) 50vw, 100vw" className={`object-contain p-2 transition-opacity duration-500 ${live && ready ? "opacity-0" : ""}`} priority={priority} />}
        {live && (inView || ready) && (
          <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}>
            <PartScene url={model!} interactive={false} rotating={spin} active={inView} onReady={() => setReady(true)} />
          </div>
        )}
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
  const [hover, setHover] = useState(false);
  return (
    <article onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[4/3]">
        <PartRender image={product.image} model={product.modelUrl} spin={hover} alt={t("Preliminary 3D draft of the {name}", { name: product.name })} />
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
