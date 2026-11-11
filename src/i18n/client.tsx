"use client";
import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { lp, splitLocale, translator, type Locale } from "./index";

const Ctx = createContext<Locale>("en");

/** Locale comes from the URL (/ja/... is Japanese), so one provider in the root layout serves both trees. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = splitLocale(usePathname() ?? "/").locale;
  // The root <html lang> is "en"; Japanese pages correct it for screen readers and fonts.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);
export const useT = () => translator(useContext(Ctx));
export const useLp = () => {
  const l = useContext(Ctx);
  return (p: string) => lp(p, l);
};
