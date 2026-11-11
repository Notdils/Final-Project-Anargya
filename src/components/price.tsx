"use client";
import { priceParts } from "@/lib/money";
import { useLocale } from "@/i18n/client";

/** USD price with the JPY reference beside it (JPY first on Japanese pages). */
export function Price({ usd, locale, className = "", subClassName = "text-xs text-muted" }: { usd: number; locale?: "en" | "ja"; className?: string; subClassName?: string }) {
  const ctx = useLocale();
  const { main, sub } = priceParts(usd, locale ?? ctx);
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      <span className="font-mono">{main}</span>
      {sub && <span className={`font-mono ${subClassName}`}>{sub}</span>}
    </span>
  );
}
