"use client";
import { formatIn, usd as fmtUsd } from "@/lib/money";
import { useCurrency } from "@/components/currency";

/** Price in the visitor's display currency (header switch). Stored prices are USD; other currencies are converted. */
export function Price({ usd, className = "" }: { usd: number; locale?: "en" | "ja"; className?: string; subClassName?: string }) {
  const { ccy, rates } = useCurrency();
  const { text, ccy: shown } = formatIn(usd, ccy, rates);
  return (
    <span className={`font-mono ${className}`} title={shown === "USD" ? undefined : `${fmtUsd(usd)} USD`}>
      {text}
    </span>
  );
}
