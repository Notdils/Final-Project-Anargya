// Shipping by destination. Shared by the checkout form (display) and the order API (authoritative).

export type Zone = { code: string; kind: "country" | "jp_region"; name: string; rateUsd: number | null; minDays: number | null; maxDays: number | null; active: boolean };
export type ShippingData = { zones: Zone[]; flatUsd: number };

/** Japan is split in two. [PLACEHOLDER] split until the team confirms it with the shipping partner. */
export const JP_REGIONS = [
  { code: "JP-EAST", en: "East Japan", ja: "東日本", hint: "Hokkaido, Tohoku, Kanto, Chubu" },
  { code: "JP-WEST", en: "West Japan", ja: "西日本", hint: "Kansai, Chugoku, Shikoku, Kyushu, Okinawa" },
] as const;
export const regionName = (code: string | null | undefined, locale: "en" | "ja" = "en") => {
  const r = JP_REGIONS.find((x) => x.code === code);
  return r ? (locale === "ja" ? r.ja : r.en) : null;
};

// Fallback when Supabase is not configured (same seed as migration 0013). [PLACEHOLDER] list.
const FALLBACK_COUNTRIES: [string, string, boolean][] = [
  ["CN", "China", true], ["HK", "Hong Kong", true], ["MO", "Macao", true], ["TW", "Taiwan", true], ["KR", "South Korea", true], ["MN", "Mongolia", true],
  ["SG", "Singapore", true], ["MY", "Malaysia", true], ["TH", "Thailand", true], ["VN", "Vietnam", true], ["PH", "Philippines", true], ["BN", "Brunei", true],
  ["KH", "Cambodia", true], ["LA", "Laos", true], ["TL", "Timor-Leste", true], ["IN", "India", true], ["PK", "Pakistan", true], ["BD", "Bangladesh", true],
  ["LK", "Sri Lanka", true], ["NP", "Nepal", true], ["BT", "Bhutan", true], ["MV", "Maldives", true], ["ID", "Indonesia", false], ["MM", "Myanmar", false],
];
export const fallbackZones = (): Zone[] => [
  ...JP_REGIONS.map((r) => ({ code: r.code, kind: "jp_region" as const, name: r.en, rateUsd: null, minDays: null, maxDays: null, active: true })),
  ...FALLBACK_COUNTRIES.map(([code, name, active]) => ({ code, kind: "country" as const, name, rateUsd: null, minDays: null, maxDays: null, active })),
];

export type Quote =
  | { ok: true; zone: Zone; shippingUsd: number; estimated: boolean; country: string; region: string | null }
  | { ok: false; field: "country" | "region"; error: string };

/** Destination -> shipping. Japan needs East or West; other countries need an active country zone. */
export function quote(data: ShippingData, country: string, region?: string | null): Quote {
  const cc = (country ?? "").toUpperCase();
  if (cc === "JP") {
    if (!JP_REGIONS.some((r) => r.code === region)) return { ok: false, field: "region", error: "Choose East or West Japan." };
    const z = data.zones.find((x) => x.code === region && x.kind === "jp_region" && x.active);
    if (!z) return { ok: false, field: "region", error: "We do not ship to this region yet." };
    return { ok: true, zone: z, shippingUsd: z.rateUsd ?? data.flatUsd, estimated: z.rateUsd === null, country: "JP", region: z.code };
  }
  const z = data.zones.find((x) => x.kind === "country" && x.code === cc && x.active);
  if (!z) return { ok: false, field: "country", error: "We do not ship to this country yet." };
  return { ok: true, zone: z, shippingUsd: z.rateUsd ?? data.flatUsd, estimated: z.rateUsd === null, country: cc, region: null };
}

/** "East Japan, Japan" style label for stored orders. */
export function destinationLabel(country: string, region?: string | null, locale: "en" | "ja" = "en", code?: string | null) {
  if (code) country = countryName(code, locale, country);
  const r = regionName(region, locale);
  return r ? (locale === "ja" ? `${country}（${r}）` : `${r}, ${country}`) : country;
}

/** Destination countries for the select: Japan first, then the active country zones. */
export const destinationCodes = (data: ShippingData) => ["JP", ...data.zones.filter((z) => z.kind === "country" && z.active).map((z) => z.code)];

// Fixed names: Intl.DisplayNames differs between Node and browsers (hydration mismatch) and uses long forms.
const NAMES: Record<string, [string, string]> = {
  JP: ["Japan", "日本"], CN: ["China", "中国"], HK: ["Hong Kong", "香港"], MO: ["Macao", "マカオ"], TW: ["Taiwan", "台湾"], KR: ["South Korea", "韓国"],
  MN: ["Mongolia", "モンゴル"], SG: ["Singapore", "シンガポール"], MY: ["Malaysia", "マレーシア"], TH: ["Thailand", "タイ"], VN: ["Vietnam", "ベトナム"],
  PH: ["Philippines", "フィリピン"], BN: ["Brunei", "ブルネイ"], KH: ["Cambodia", "カンボジア"], LA: ["Laos", "ラオス"], TL: ["Timor-Leste", "東ティモール"],
  IN: ["India", "インド"], PK: ["Pakistan", "パキスタン"], BD: ["Bangladesh", "バングラデシュ"], LK: ["Sri Lanka", "スリランカ"], NP: ["Nepal", "ネパール"],
  BT: ["Bhutan", "ブータン"], MV: ["Maldives", "モルディブ"], ID: ["Indonesia", "インドネシア"], MM: ["Myanmar", "ミャンマー"],
};

/** Country name in the page language, with the zone name (from the database) as fallback. */
export function countryName(code: string, locale: "en" | "ja", fallback?: string) {
  const n = NAMES[code.toUpperCase()];
  return n ? n[locale === "ja" ? 1 : 0] : fallback ?? code;
}
