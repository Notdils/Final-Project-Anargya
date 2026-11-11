// Prices are set in USD (Finance selling prices). JPY is shown alongside for reference;
// the buyer is charged in IDR through Midtrans at the server-side USD -> IDR rate.

/** Display-only USD -> JPY rate (public). Null hides the yen reference. */
export const FX_USD_JPY = (() => {
  const v = Number(process.env.NEXT_PUBLIC_FX_USD_JPY);
  return Number.isFinite(v) && v > 0 ? v : null;
})();

export const usd = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const yenFromUsd = (n: number) => (FX_USD_JPY ? Math.round(Number(n) * FX_USD_JPY) : null);
export const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

/** Primary and secondary price strings for a locale: EN shows USD first, JA shows JPY first. */
export function priceParts(amountUsd: number, locale: "en" | "ja" = "en") {
  const y = yenFromUsd(amountUsd);
  if (locale === "ja" && y !== null) return { main: yen(y), sub: `(${usd(amountUsd)})` };
  return { main: usd(amountUsd), sub: y !== null ? `≈ ${yen(y)}` : null };
}

/** Old orders were priced in JPY; new ones in USD. */
export function orderAmount(o: { total_usd?: number | string | null; total_jpy?: number | null }) {
  return o.total_usd != null ? usd(Number(o.total_usd)) : o.total_jpy != null ? yen(o.total_jpy) : "-";
}

// Display currency (header switch). Prices are stored in USD; JPY and IDR are converted for display only.
export type Currency = "USD" | "JPY" | "IDR";
export const CURRENCIES: Currency[] = ["USD", "JPY", "IDR"];
export type Rates = { JPY: number | null; IDR: number | null };

/** Formats a USD amount in the chosen currency; falls back to USD when that rate is not set. */
export function formatIn(amountUsd: number, ccy: Currency, rates: Rates) {
  const r = ccy === "USD" ? 1 : rates[ccy];
  if (!r) return { text: usd(amountUsd), ccy: "USD" as Currency };
  const v = Number(amountUsd) * r;
  if (ccy === "JPY") return { text: yen(v), ccy };
  if (ccy === "IDR") return { text: `Rp${Math.round(v).toLocaleString("id-ID")}`, ccy };
  return { text: usd(v), ccy };
}
