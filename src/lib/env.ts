// Feature flags derived from environment. The site renders with placeholder data when
// Supabase is not configured, so the UI can be reviewed before the backend exists.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
export const MIDTRANS_SNAP_JS = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";

// USD -> IDR rate used to charge through Midtrans. Must be set explicitly (no invented default).
export const fxUsdIdr = () => {
  const v = Number(process.env.FX_USD_IDR);
  return Number.isFinite(v) && v > 0 ? v : null;
};
export const shippingUsd = () => Math.max(0, Number(process.env.SHIPPING_FLAT_USD) || 0);

// Consultation fee (USD) for a 30-minute call, charged in IDR via Midtrans. Must be set explicitly.
export const consultFeeUsd = () => {
  const v = Number(process.env.CONSULT_FEE_USD);
  return Number.isFinite(v) && v > 0 ? v : null;
};
