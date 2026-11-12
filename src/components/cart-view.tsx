"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart";
import { StockBadge } from "./product";
import type { Product } from "@/lib/data";
import { Price } from "./price";
import { useLp, useT } from "@/i18n/client";

export function useCartLines(products: Product[]) {
  const cart = useCart();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = cart.lines.flatMap((l) => {
    const p = byId.get(l.id);
    return p ? [{ ...l, product: p }] : [];
  });
  const subtotal = lines.reduce((s, l) => s + l.product.priceUsd * l.qty, 0);
  return { cart, lines, subtotal };
}

export function CartView({ products }: { products: Product[] }) {
  const t = useT();
  const L = useLp();
  const { cart, lines, subtotal } = useCartLines(products);
  // Remove is instant with an Undo toast for 6 seconds, instead of a confirm dialog.
  const [removed, setRemoved] = useState<{ id: string; qty: number; name: string } | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);
  const removeLine = (id: string, qty: number, name: string) => {
    cart.remove(id);
    setRemoved({ id, qty, name });
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setRemoved(null), 6000);
  };
  const undo = () => { if (removed) cart.add(removed.id, removed.qty); setRemoved(null); window.clearTimeout(undoTimer.current); };
  const toast = removed && (
    <div role="status" className="fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[1300] mx-auto flex max-w-md items-center justify-between gap-4 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-lg motion-safe:animate-[toast-in_200ms_ease-out]">
      <span className="truncate">{t("Removed {name}.", { name: removed.name })}</span>
      <button type="button" onClick={undo} className="min-h-10 shrink-0 rounded-md px-3 font-semibold text-[#b8d7d4] hover:bg-white/10">{t("Undo")}</button>
    </div>
  );

  if (!cart.ready) return <div className="container-x pb-20 text-muted">{t("Loading cart…")}</div>;
  if (lines.length === 0)
    return (
      <div className="container-x pb-20">
        {toast}
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="font-medium">{t("Your cart is empty.")}</p>
          <Link href={L("/marketplace")} className="btn btn-teal mt-4">{t("Browse marketplace")}</Link>
        </div>
      </div>
    );

  return (
    <div className="container-x grid gap-6 pb-12 md:pb-20 xl:grid-cols-[1fr_400px] xl:gap-12">
      {toast}
      <ul aria-label={t("Items in cart")}>
        {lines.map(({ id, qty, product: p }) => {
          const over = qty > p.stock;
          return (
            <li key={id} className="flex gap-4 border-b border-line py-6">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-white md:h-24 md:w-[120px]" aria-hidden>{p.image && <Image src={p.image} alt="" fill sizes="120px" className="object-contain p-1" />}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="eyebrow text-muted">{p.code}</span>
                <Link href={L(`/marketplace/${p.slug}`)} className="font-medium hover:underline">{p.name}</Link>
                <Price usd={p.priceUsd * qty} className="text-sm md:hidden" />
                <StockBadge product={p} />
                {over && <p role="alert" className="text-[13px] text-oxide">{t("Only {n} left. Lower the quantity to continue.", { n: p.stock })}</p>}
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center rounded-lg border border-line" role="group" aria-label={t("Quantity for {name}", { name: p.name })}>
                    <button type="button" className="p-2.5 pointer-coarse:p-3.5 disabled:opacity-40" aria-label={t("Decrease")} disabled={qty <= 1} onClick={() => cart.setQty(id, qty - 1)}><Minus size={16} aria-hidden /></button>
                    <output className="min-w-8 text-center font-mono text-sm font-medium">{qty}</output>
                    <button type="button" className="p-2.5 pointer-coarse:p-3.5 disabled:opacity-40" aria-label={t("Increase")} disabled={qty >= Math.min(20, p.stock)} onClick={() => cart.setQty(id, qty + 1)}><Plus size={16} aria-hidden /></button>
                  </div>
                  <button type="button" onClick={() => removeLine(id, qty, p.name)} className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-medium text-oxide hover:underline">
                    <Trash2 size={14} aria-hidden /> {t("Remove")}
                  </button>
                </div>
              </div>
              <Price usd={p.priceUsd * qty} className="hidden text-sm md:block" />
            </li>
          );
        })}
      </ul>

      <aside aria-labelledby="sum-title" className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-surface p-6">
        <h2 id="sum-title" className="text-lg font-semibold">{t("Order summary")}</h2>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t("Subtotal")}</dt><dd><Price usd={subtotal} /></dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t("Shipping")}</dt><dd className="font-mono">{t("Calculated at checkout")}</dd></div>
          <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">{t("Total")}</dt><dd className="font-medium"><Price usd={subtotal} /></dd></div>
        </dl>
        <p className="text-xs text-muted">{t("Prices are in USD (yen shown for reference). You pay the IDR equivalent through Midtrans at checkout.")}</p>
        <Link
          href={L("/checkout")}
          aria-disabled={lines.some((l) => l.qty > l.product.stock)}
          className="btn btn-teal btn-lg w-full aria-disabled:pointer-events-none"
        >
          {t("Checkout")}
        </Link>
        <Link href={L("/marketplace")} className="text-center text-sm font-medium text-teal hover:underline">{t("Continue shopping")}</Link>
      </aside>
    </div>
  );
}
