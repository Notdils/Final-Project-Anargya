"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Wind, Zap, Box, Disc, Activity, Cog } from "lucide-react";
import type { Category, Product } from "@/lib/data";
import { categoryLabel } from "@/lib/data";
import { yen } from "@/lib/format";
import { PartRender, StockBadge } from "./product";

const ICON: Record<Category, typeof Wind> = { aero: Wind, electrical: Zap, chassis: Box, drivetrain: Cog, suspension: Disc };

function Brackets() {
  const c = "absolute h-4 w-4 border-teal";
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-3">
      <span className={`${c} left-0 top-0 border-l-[1.5px] border-t-[1.5px]`} />
      <span className={`${c} right-0 top-0 border-r-[1.5px] border-t-[1.5px]`} />
      <span className={`${c} bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]`} />
      <span className={`${c} bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]`} />
    </div>
  );
}

function Card({ p, active }: { p: Product; active: boolean }) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-stage-line bg-stage-2 p-4 text-white md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-neutral-400">{p.code}</span>
          {active && <StockBadge product={p} dark />}
        </div>
        <h3 className="text-lg font-medium leading-6 md:text-[22px] md:leading-7">{p.name}</h3>
      </div>
      <div className="min-h-0 flex-1">
        <PartRender dark label="Part 3D / turntable" />
      </div>
      {active && (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">Specifications</p>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 font-mono text-[11px] uppercase text-neutral-400 sm:grid-cols-2">
              {[["Material", p.material], ["Weight", p.weight], ["Fits", p.fits], ["Lead time", p.leadTime]].map(([k, v]) => (
                <div key={k} className="flex gap-2"><dt>{k}</dt><dd className="truncate">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="flex items-center justify-between border-t border-stage-line pt-4">
            <span className="font-mono font-medium">{yen(p.priceJpy)}</span>
            <Link href={`/marketplace/${p.slug}`} className="btn btn-teal">View part</Link>
          </div>
        </>
      )}
    </div>
  );
}

export function Coverflow({ products, headingId = "featured-title" }: { products: Product[]; headingId?: string }) {
  const [i, setI] = useState(Math.min(1, products.length - 1));
  const n = products.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);
  const root = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  if (n === 0) return null;
  const prev = products[(i - 1 + n) % n], next = products[(i + 1) % n], cur = products[i];

  return (
    <section aria-labelledby={headingId} className="overflow-hidden bg-stage py-12 text-white md:py-24">
      <div className="container-x mb-8 flex flex-col items-center gap-3 text-center md:mb-12">
        <p className="eyebrow text-neutral-400">Marketplace</p>
        <h2 id={headingId} className="text-[32px] font-semibold leading-10 tracking-[-0.03em] md:text-5xl md:leading-[56px]">
          Featured parts
        </h2>
      </div>

      <div
        ref={root}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured parts"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
        className="relative mx-auto flex h-[520px] max-w-[1280px] items-center justify-center outline-none md:h-[600px]"
      >
        {[{ p: prev, pos: -1 }, { p: next, pos: 1 }].map(({ p, pos }) => (
          <button
            key={`${p.id}-${pos}`}
            type="button"
            onClick={() => go(pos)}
            aria-label={`${p.code} ${p.name}`}
            className={`absolute top-1/2 h-[440px] w-[calc(100vw-80px)] -translate-y-1/2 opacity-35 transition-all duration-500 hover:opacity-50 md:h-[520px] md:w-[300px] xl:w-[360px] ${
              pos < 0 ? "right-[calc(100vw-28px)] md:right-[calc(50%+200px+32px)] xl:right-[calc(50%+240px+32px)]" : "left-[calc(100vw-28px)] md:left-[calc(50%+200px+32px)] xl:left-[calc(50%+240px+32px)]"
            } ${reduce ? "transition-none" : ""}`}
          >
            <Card p={p} active={false} />
          </button>
        ))}
        <div
          key={cur.id}
          aria-live="polite"
          className={`relative z-10 h-full w-[calc(100vw-80px)] md:w-[400px] xl:w-[480px] ${reduce ? "" : "animate-[fadeUp_.45s_ease-out]"}`}
        >
          <Brackets />
          <Card p={cur} active />
        </div>
      </div>

      <div className="mt-8 flex justify-center md:mt-12">
        <div className="flex max-w-[calc(100vw-40px)] items-center gap-1 overflow-x-auto rounded-lg border border-stage-line bg-[#171717] p-1">
          <button type="button" className="rounded p-2 text-neutral-400 hover:text-white" aria-label="Previous part" onClick={() => go(-1)}>
            <ChevronLeft size={16} aria-hidden />
          </button>
          {products.map((p, k) => {
            const Icon = ICON[p.category] ?? Activity;
            const on = k === i;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setI(k)}
                aria-label={`${p.name}, ${categoryLabel(p.category)}`}
                aria-current={on}
                className={`rounded p-2 ${on ? "bg-teal text-white" : "text-neutral-400 hover:text-white"}`}
              >
                <Icon size={16} aria-hidden />
              </button>
            );
          })}
          <button type="button" className="rounded p-2 text-neutral-400 hover:text-white" aria-label="Next part" onClick={() => go(1)}>
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
