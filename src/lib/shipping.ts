// Shipping by destination. Shared by the checkout form (display) and the order API (authoritative).

export type Zone = { code: string; kind: "country" | "jp_region"; name: string; rateUsd: number | null; minDays: number | null; maxDays: number | null; active: boolean; region: string | null };
/** DHL region (0025): delivery days, and a rate per box for each part. */
export type Region = { code: string; name: string; dhlZone: string | null; minDays: number | null; maxDays: number | null; rates: Record<string, number> };
export type ShippingData = { zones: Zone[]; regions: Region[]; flatUsd: number };
export type QuoteItem = { id: string; qty: number };

/** Japan used to be split East / West. Japan is now one destination (0026); this list only labels old orders. */
export const JP_REGIONS = [
  { code: "JP-EAST", en: "East Japan", ja: "東日本", hint: "Hokkaido, Tohoku, Kanto, Chubu" },
  { code: "JP-WEST", en: "West Japan", ja: "西日本", hint: "Kansai, Chugoku, Shikoku, Kyushu, Okinawa" },
] as const;
export const regionName = (code: string | null | undefined, locale: "en" | "ja" = "en") => {
  const r = JP_REGIONS.find((x) => x.code === code);
  return r ? (locale === "ja" ? r.ja : r.en) : null;
};

// Fallback when Supabase is not configured (same as migrations 0013 + 0025): countries and their DHL region.
const FALLBACK_COUNTRIES: [string, string, string][] = [
  ["KR", "South Korea", "ASIA_EAST"], ["TW", "Taiwan", "ASIA_EAST"], ["HK", "Hong Kong", "ASIA_EAST"], ["CN", "China", "ASIA_EAST"],
  ["ID", "Indonesia", "ASIA_SOUTHEAST"], ["MY", "Malaysia", "ASIA_SOUTHEAST"], ["TH", "Thailand", "ASIA_SOUTHEAST"], ["SG", "Singapore", "ASIA_SOUTHEAST"], ["VN", "Vietnam", "ASIA_SOUTHEAST"], ["PH", "Philippines", "ASIA_SOUTHEAST"],
  ["IN", "India", "ASIA_SOUTH"], ["LK", "Sri Lanka", "ASIA_SOUTH"], ["BD", "Bangladesh", "ASIA_SOUTH"], ["PK", "Pakistan", "ASIA_SOUTH"],
  ["AE", "United Arab Emirates", "ASIA_WEST"], ["SA", "Saudi Arabia", "ASIA_WEST"], ["QA", "Qatar", "ASIA_WEST"], ["TR", "Turkey", "ASIA_WEST"], ["JO", "Jordan", "ASIA_WEST"],
  ["KZ", "Kazakhstan", "ASIA_CENTRAL"], ["UZ", "Uzbekistan", "ASIA_CENTRAL"], ["KG", "Kyrgyzstan", "ASIA_CENTRAL"],
];
export const fallbackZones = (): Zone[] => [
  { code: "JP", kind: "country" as const, name: "Japan", rateUsd: 0, minDays: null, maxDays: null, active: true, region: null },
  ...FALLBACK_COUNTRIES.map(([code, name, region]) => ({ code, kind: "country" as const, name, rateUsd: null, minDays: null, maxDays: null, active: true, region })),
];

export type Quote =
  | { ok: true; zone: Zone; shippingUsd: number; estimated: boolean; customerPaid: boolean; minDays: number | null; maxDays: number | null; country: string; region: string | null }
  | { ok: false; field: "country"; error: string };

/** Destination + cart -> shipping. Japan (one destination): the customer pays the courier, so 0 here.
 *  Elsewhere: sum of qty x the region's DHL rate per box for each part. A part without a rate uses
 *  the zone rate or SHIPPING_FLAT_USD and the quote is marked estimated. */
export function quote(data: ShippingData, country: string, items: QuoteItem[]): Quote {
  const cc = (country ?? "").toUpperCase();
  if (cc === "JP") {
    // One destination for all of Japan (0026). Before that migration runs, an old East/West zone stands in.
    const z = data.zones.find((x) => x.code === "JP" && x.active) ?? data.zones.find((x) => x.kind === "jp_region" && x.active);
    if (!z) return { ok: false, field: "country", error: "We do not ship to this country yet." };
    return { ok: true, zone: z, shippingUsd: 0, estimated: false, customerPaid: true, minDays: z.minDays, maxDays: z.maxDays, country: "JP", region: null };
  }
  const z = data.zones.find((x) => x.kind === "country" && x.code === cc && x.active);
  if (!z) return { ok: false, field: "country", error: "We do not ship to this country yet." };
  const r = data.regions.find((x) => x.code === z.region);
  let total = 0, estimated = false;
  for (const it of items) {
    const rate = r?.rates[it.id];
    if (rate === undefined) estimated = true;
    total += (rate ?? z.rateUsd ?? data.flatUsd) * it.qty;
  }
  return { ok: true, zone: z, shippingUsd: Math.round(total * 100) / 100, estimated, customerPaid: false, minDays: r?.minDays ?? z.minDays, maxDays: r?.maxDays ?? z.maxDays, country: cc, region: null };
}

/** "East Japan, Japan" style label for stored orders. */
export function destinationLabel(country: string, region?: string | null, locale: "en" | "ja" = "en", code?: string | null) {
  if (code) country = countryName(code, locale, country);
  const r = regionName(region, locale);
  return r ? (locale === "ja" ? `${country}（${r}）` : `${r}, ${country}`) : country;
}

/** Destination countries for the select: Japan first, then the active country zones. */
export const destinationCodes = (data: ShippingData) => ["JP", ...data.zones.filter((z) => z.kind === "country" && z.active && z.code !== "JP").map((z) => z.code)];

// Fixed names: Intl.DisplayNames differs between Node and browsers (hydration mismatch) and uses long forms.
const NAMES: Record<string, [string, string]> = {
  JP: ["Japan", "日本"], CN: ["China", "中国"], HK: ["Hong Kong", "香港"], MO: ["Macao", "マカオ"], TW: ["Taiwan", "台湾"], KR: ["South Korea", "韓国"],
  MN: ["Mongolia", "モンゴル"], SG: ["Singapore", "シンガポール"], MY: ["Malaysia", "マレーシア"], TH: ["Thailand", "タイ"], VN: ["Vietnam", "ベトナム"],
  PH: ["Philippines", "フィリピン"], BN: ["Brunei", "ブルネイ"], KH: ["Cambodia", "カンボジア"], LA: ["Laos", "ラオス"], TL: ["Timor-Leste", "東ティモール"],
  IN: ["India", "インド"], PK: ["Pakistan", "パキスタン"], BD: ["Bangladesh", "バングラデシュ"], LK: ["Sri Lanka", "スリランカ"], NP: ["Nepal", "ネパール"],
  BT: ["Bhutan", "ブータン"], MV: ["Maldives", "モルディブ"], ID: ["Indonesia", "インドネシア"], MM: ["Myanmar", "ミャンマー"],
  AE: ["United Arab Emirates", "アラブ首長国連邦"], SA: ["Saudi Arabia", "サウジアラビア"], QA: ["Qatar", "カタール"], TR: ["Turkey", "トルコ"], JO: ["Jordan", "ヨルダン"],
  KZ: ["Kazakhstan", "カザフスタン"], UZ: ["Uzbekistan", "ウズベキスタン"], KG: ["Kyrgyzstan", "キルギス"],
};

/** Country name in the page language, with the zone name (from the database) as fallback. */
export function countryName(code: string, locale: "en" | "ja", fallback?: string) {
  const n = NAMES[code.toUpperCase()];
  return n ? n[locale === "ja" ? 1 : 0] : fallback ?? code;
}
