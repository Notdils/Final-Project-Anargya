"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { useCart } from "./cart";
import { Price } from "./price";
import { useLp, useT } from "@/i18n/client";

export function PurchasePanel({ id, price, stock }: { id: string; price: number; stock: number }) {
  const t = useT();
  const L = useLp();
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const max = Math.max(1, Math.min(20, stock));
  const out = stock <= 0;

  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addToCart = () => {
    add(id, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" id="qty-label">{t("Quantity")}</span>
        <div className="inline-flex w-fit items-center rounded-lg border border-line" role="group" aria-labelledby="qty-label">
          <button type="button" className="p-3 disabled:opacity-40" aria-label={t("Decrease quantity")} disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}><Minus size={16} aria-hidden /></button>
          <output className="min-w-10 px-2 text-center font-mono font-medium" aria-live="polite">{qty}</output>
          <button type="button" className="p-3 disabled:opacity-40" aria-label={t("Increase quantity")} disabled={qty >= max} onClick={() => setQty((q) => q + 1)}><Plus size={16} aria-hidden /></button>
        </div>
      </div>
      <div ref={anchor} className="flex flex-col gap-2">
        <button type="button" className="btn btn-teal btn-lg w-full" disabled={out} onClick={addToCart}>
          {added ? <><Check size={16} aria-hidden /> {t("Added to cart")}</> : t(out ? "Out of stock" : "Add to cart")}
        </button>
        <button type="button" className="btn btn-outline btn-lg w-full" disabled={out} onClick={() => { add(id, qty); router.push(L("/checkout")); }}>
          {t("Buy now")}
        </button>
        <p className="sr-only" aria-live="polite">{added ? t("Added to cart") : ""}</p>
      </div>

      <div
        aria-hidden={!showBar}
        className={`fixed inset-x-0 bottom-0 z-[1050] flex items-center justify-between gap-3 border-t border-line bg-white px-5 py-3 transition-transform duration-200 md:hidden ${showBar ? "translate-y-0" : "invisible translate-y-full"}`}
      >
        <Price usd={price * qty} className="font-medium" />
        <button type="button" tabIndex={showBar ? 0 : -1} className="btn btn-teal" disabled={out} onClick={addToCart}>
          {t(added ? "Added" : "Add to cart")}
        </button>
      </div>
    </>
  );
}
