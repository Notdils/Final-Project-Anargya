"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { CURRENCIES, formatIn, type Currency, type Rates } from "@/lib/money";
import { useLocale, useT } from "@/i18n/client";

const KEY = "anargya-currency";
type Ctx = { ccy: Currency; setCcy: (c: Currency) => void; rates: Rates };
const C = createContext<Ctx>({ ccy: "USD", setCcy: () => {}, rates: { JPY: null, IDR: null } });

/** Display currency for the whole site. Default: USD on English pages, JPY on Japanese pages; the choice is remembered. */
export function CurrencyProvider({ rates, children }: { rates: Rates; children: React.ReactNode }) {
  const locale = useLocale();
  const [chosen, setChosen] = useState<Currency | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as Currency | null;
      if (v && CURRENCIES.includes(v)) setChosen(v);
    } catch {}
  }, []);
  const fallback: Currency = locale === "ja" && rates.JPY ? "JPY" : "USD";
  const ccy = chosen && (chosen === "USD" || rates[chosen]) ? chosen : fallback;
  const setCcy = (c: Currency) => {
    setChosen(c);
    try { localStorage.setItem(KEY, c); } catch {}
  };
  return <C.Provider value={{ ccy, setCcy, rates }}>{children}</C.Provider>;
}

export const useCurrency = () => useContext(C);

/** Formats a USD amount in the visitor's display currency. */
export function useMoney() {
  const { ccy, rates } = useCurrency();
  return (amountUsd: number) => formatIn(amountUsd, ccy, rates).text;
}

/** Header control. Only lists currencies that have a rate configured. */
export function CurrencySwitch({ className = "" }: { className?: string }) {
  const t = useT();
  const { ccy, setCcy, rates } = useCurrency();
  const options = CURRENCIES.filter((c) => c === "USD" || rates[c]);
  if (options.length < 2) return null;
  return (
    <label className={`relative ${className}`}>
      <span className="sr-only">{t("Currency")}</span>
      <select value={ccy} onChange={(e) => setCcy(e.target.value as Currency)} className="h-full cursor-pointer appearance-none bg-transparent pl-3 pr-7 font-mono text-xs outline-none">
        {options.map((c) => <option key={c} value={c} className="text-ink">{c}</option>)}
      </select>
      <svg aria-hidden viewBox="0 0 16 16" width={12} height={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    </label>
  );
}
