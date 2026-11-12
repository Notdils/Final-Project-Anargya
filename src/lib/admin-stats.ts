import "server-only";
import { reconcileStale } from "@/lib/reconcile";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
import { countryName, regionName } from "@/lib/shipping";
import type { Order } from "@/lib/orders";

// Overview ranges. Buckets are in JST (the company's business day).
export const RANGES = [
  { id: "1d", label: "1D", long: "Last 24 hours", days: 1, bucket: "hour" },
  { id: "1m", label: "1M", long: "Last 30 days", days: 30, bucket: "day" },
  { id: "3m", label: "3M", long: "Last 3 months", days: 91, bucket: "week" },
  { id: "6m", label: "6M", long: "Last 6 months", days: 182, bucket: "week" },
  { id: "1y", label: "1Y", long: "Last 12 months", days: 365, bucket: "month" },
] as const;
export type RangeId = (typeof RANGES)[number]["id"];
export const parseRange = (v?: string) => RANGES.find((r) => r.id === v) ?? RANGES[1];

const JST = 9 * 3600e3;
const pad = (n: number) => String(n).padStart(2, "0");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Start of the JST bucket containing t (returned as a UTC ms timestamp) and its axis label. */
function bucketOf(t: number, kind: string): { key: number; label: string } {
  const d = new Date(t + JST); // read with getUTC* = JST wall clock
  if (kind === "hour") { d.setUTCMinutes(0, 0, 0); return { key: d.getTime() - JST, label: `${pad(d.getUTCHours())}:00` }; }
  d.setUTCHours(0, 0, 0, 0);
  if (kind === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
  if (kind === "month") d.setUTCDate(1);
  const label = kind === "month" ? `${MON[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
  return { key: d.getTime() - JST, label };
}
function nextBucket(key: number, kind: string) {
  const d = new Date(key + JST);
  if (kind === "hour") d.setUTCHours(d.getUTCHours() + 1);
  else if (kind === "day") d.setUTCDate(d.getUTCDate() + 1);
  else if (kind === "week") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.getTime() - JST;
}

type Row = Pick<Order, "id" | "receipt_no" | "buyer_name" | "total_jpy" | "total_usd" | "status" | "created_at" | "user_id" | "fulfilment_status" | "ship_country" | "ship_region"> & {
  needs_review?: boolean; order_items?: { product_id: string; name: string; qty: number; unit_price_usd: number | string | null }[];
};

const pct = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : null);

/**
 * Everything the Overview page shows, from 4 reads run in parallel: orders (current + previous period, with items),
 * paid consultations, new accounts, and the action counts.
 */
export async function overviewStats(range: (typeof RANGES)[number]) {
  const sb = await supabaseServer();
  if (!sb) return null;
  await reconcileStale().catch(() => {});
  const now = Date.now(), span = range.days * 864e5;
  const from = now - span, prevFrom = now - 2 * span;
  const iso = (t: number) => new Date(t).toISOString();
  const svc = supabaseService();
  const [ord, books, users, actions] = await Promise.all([
    sb.from("orders").select("id, receipt_no, buyer_name, total_jpy, total_usd, status, created_at, user_id, fulfilment_status, ship_country, ship_region, needs_review, order_items(product_id, name, qty, unit_price_usd)")
      .gte("created_at", iso(prevFrom)).order("created_at", { ascending: false }).limit(10000),
    sb.from("bookings").select("pay_status, fee_usd, created_at").gte("created_at", iso(prevFrom)).eq("pay_status", "paid").limit(5000),
    svc ? svc.auth.admin.listUsers({ page: 1, perPage: 1000 }) : Promise.resolve({ data: null }),
    Promise.all([
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid").eq("fulfilment_status", "to_pack"),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("needs_review", true),
    ]),
  ]);

  const all = (ord.data ?? []) as Row[];
  const inCur = (r: { created_at: string }) => Date.parse(r.created_at) >= from;
  const paidCur = all.filter((o) => o.status === "paid" && inCur(o));
  const paidPrev = all.filter((o) => o.status === "paid" && !inCur(o));
  const money = (rows: Row[]) => rows.reduce((s, o) => s + Number(o.total_usd ?? 0), 0); // USD orders; old JPY test orders excluded
  const revenue = money(paidCur), revenuePrev = money(paidPrev);
  const aov = paidCur.length ? revenue / paidCur.length : 0;
  const aovPrev = paidPrev.length ? revenuePrev / paidPrev.length : 0;

  // revenue and paid orders per bucket, with empty buckets filled in
  const buckets: { key: number; label: string; revenue: number; orders: number }[] = [];
  for (let k = bucketOf(from, range.bucket).key; k <= now; k = nextBucket(k, range.bucket)) buckets.push({ key: k, label: bucketOf(k, range.bucket).label, revenue: 0, orders: 0 });
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const o of paidCur) {
    const i = idx.get(bucketOf(Date.parse(o.created_at), range.bucket).key);
    if (i !== undefined) { buckets[i].revenue += Number(o.total_usd ?? 0); buckets[i].orders += 1; }
  }

  // revenue by product (line items) and by destination
  const prod = new Map<string, { name: string; revenue: number; units: number }>();
  const dest = new Map<string, { name: string; revenue: number; orders: number }>();
  for (const o of paidCur) {
    for (const it of o.order_items ?? []) {
      const p = prod.get(it.product_id) ?? { name: it.name, revenue: 0, units: 0 };
      p.revenue += Number(it.unit_price_usd ?? 0) * it.qty; p.units += it.qty;
      prod.set(it.product_id, p);
    }
    const key = o.ship_country ? `${o.ship_country}${o.ship_region ? `:${o.ship_region}` : ""}` : "unknown";
    const name = o.ship_country ? `${countryName(o.ship_country, "en")}${o.ship_region ? ` · ${regionName(o.ship_region)}` : ""}` : "Not recorded";
    const d = dest.get(key) ?? { name, revenue: 0, orders: 0 };
    d.revenue += Number(o.total_usd ?? 0); d.orders += 1;
    dest.set(key, d);
  }


  const bk = (books.data ?? []) as { fee_usd: number | null; created_at: string }[];
  const bkCur = bk.filter(inCur), bkPrev = bk.filter((b) => !inCur(b));
  const us = (users.data?.users ?? []) as { created_at: string; app_metadata?: { role?: string } }[];
  const customers = us.filter((u) => !u.app_metadata?.role || u.app_metadata.role === "customer");
  const newCur = customers.filter(inCur).length, newPrev = customers.filter((u) => Date.parse(u.created_at) >= prevFrom && !inCur(u)).length;
  const buyers = new Set(paidCur.map((o) => o.user_id).filter(Boolean)).size;
  const [toPack, waiting, review] = actions.map((r) => r.count ?? 0);

  return {
    kpi: {
      revenue: { v: revenue, d: pct(revenue, revenuePrev) },
      orders: { v: paidCur.length, d: pct(paidCur.length, paidPrev.length) },
      aov: { v: aov, d: pct(aov, aovPrev) },
      newCustomers: { v: svc ? newCur : null, d: pct(newCur, newPrev) },
      buyers,
      units: [...prod.values()].reduce((n, p) => n + p.units, 0),
      consultations: { v: bkCur.length, revenue: bkCur.reduce((s, b) => s + Number(b.fee_usd ?? 0), 0), d: pct(bkCur.length, bkPrev.length) },
    },
    actions: { toPack, waiting, review },
    series: buckets,
    products: [...prod.values()].sort((a, b) => b.revenue - a.revenue),
    destinations: [...dest.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    recent: all.filter(inCur).slice(0, 10),
  };
}
