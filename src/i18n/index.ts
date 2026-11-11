// Two locales: English at the root, Japanese under /ja. Strings are written in English in the code
// and looked up in the Japanese table; anything missing falls back to English (never blank).
import { JA } from "./ja";

export type Locale = "en" | "ja";
export const LOCALES: Locale[] = ["en", "ja"];

type Vars = Record<string, string | number>;
const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`)) : s);

export type T = (s: string, v?: Vars) => string;
export const translator = (locale: Locale): T => (s, v) => fill(locale === "ja" ? JA[s] ?? s : s, v);

/** Locale-prefixed path: lp("/about", "ja") -> "/ja/about". Leaves external, hash and api links alone. */
export const lp = (path: string, locale: Locale) => {
  if (locale === "en" || !path.startsWith("/") || path.startsWith("/api") || path.startsWith("/admin")) return path;
  if (path === "/ja" || path.startsWith("/ja/") || path.startsWith("/ja?") || path.startsWith("/ja#")) return path;
  return path === "/" ? "/ja" : path.startsWith("/?") || path.startsWith("/#") ? `/ja${path.slice(1)}` : `/ja${path}`;
};

/** Strip a /ja prefix: "/ja/about" -> { locale: "ja", path: "/about" }. */
export const splitLocale = (pathname: string): { locale: Locale; path: string } =>
  pathname === "/ja" || pathname.startsWith("/ja/") ? { locale: "ja", path: pathname.slice(3) || "/" } : { locale: "en", path: pathname };

export const htmlLang = (l: Locale) => (l === "ja" ? "ja" : "en");
