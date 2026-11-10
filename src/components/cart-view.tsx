"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart";
import { StockBadge } from "./product";
import type { Product } from "@/lib/data";
import { yen } from "@/lib/format";

export function useCartLines(products: Product[]) {
  const cart = useCart();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = cart.lines.flatMap((l) => {
    const p = byId.get(l.id);
    return p ? [{ ...l, product: p }] : [];
  });
  const subtotal = lines.reduce((s, l) => s + l.product.priceJpy * l.qty, 0);
  return { cart, lines, subtotal };
}

export function CartView({ products }: { products: Product[] }) {
  const { cart, lines, subtotal } = useCartLines(products);

  if (!cart.ready) return <div className="container-x pb-20 text-muted">Loading cart…</div>;
  if (lines.length === 0)
    return (
      <div className="container-x pb-20">
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="font-medium">Your cart is empty.</p>
          <Link href="/marketplace" className="btn btn-ochre mt-4">Browse marketplace</Link>
        </div>
      </div>
    );

  return (
    <div className="container-x grid gap-6 pb-12 md:pb-20 xl:grid-cols-[1fr_400px] xl:gap-12">
      <ul aria-label="Items in cart">
        {lines.map(({ id, qty, product: p }) => {
          const over = qty > p.stock;
          return (
            <li key={id} className="flex gap-4 border-b border-line py-6">
              <div className="h-16 w-20 shrink-0 rounded-lg bg-surface-2 md:h-24 md:w-[120px]" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="eyebrow text-muted">{p.code}</span>
                <Link href={`/marketplace/${p.slug}`} className="font-medium hover:underline">{p.name}</Link>
                <span className="font-mono text-sm md:hidden">{yen(p.priceJpy * qty)}</span>
                <StockBadge product={p} />
                {over && <p role="alert" className="text-[13px] text-oxide">Only {p.stock} left. Lower the quantity to continue.</p>}
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center rounded-lg border border-line" role="group" aria-label={`Quantity for ${p.name}`}>
                    <button type="button" className="p-2.5 disabled:opacity-40" aria-label="Decrease" disabled={qty <= 1} onClick={() => cart.setQty(id, qty - 1)}><Minus size={16} aria-hidden /></button>
                    <output className="min-w-8 text-center font-mono text-sm font-medium">{qty}</output>
                    <button type="button" className="p-2.5 disabled:opacity-40" aria-label="Increase" disabled={qty >= Math.min(20, p.stock)} onClick={() => cart.setQty(id, qty + 1)}><Plus size={16} aria-hidden /></button>
                  </div>
                  <button type="button" onClick={() => cart.remove(id)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-oxide hover:underline">
                    <Trash2 size={14} aria-hidden /> Remove
                  </button>
                </div>
              </div>
              <span className="hidden font-mono text-sm md:block">{yen(p.priceJpy * qty)}</span>
            </li>
          );
        })}
      </ul>

      <aside aria-labelledby="sum-title" className="flex h-fit flex-col gap-4 rounded-xl border border-line bg-surface p-6">
        <h2 id="sum-title" className="text-lg font-semibold">Order summary</h2>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-mono">{yen(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="font-mono">Calculated at checkout</dd></div>
          <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">Total</dt><dd className="font-mono font-medium">{yen(subtotal)}</dd></div>
        </dl>
        <p className="text-xs text-muted">Prices are in JPY. You will be charged the IDR equivalent through Midtrans at checkout.</p>
        <Link
          href="/checkout"
          aria-disabled={lines.some((l) => l.qty > l.product.stock)}
          className="btn btn-ochre btn-lg w-full aria-disabled:pointer-events-none"
        >
          Checkout
        </Link>
        <Link href="/marketplace" className="text-center text-sm font-medium text-teal hover:underline">Continue shopping</Link>
      </aside>
    </div>
  );
}
