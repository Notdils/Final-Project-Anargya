import { guardPage } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { listProducts } from "@/lib/catalog";
import { VouchersManager, type VoucherRow } from "@/components/admin/vouchers-manager";

export const metadata = { title: "Vouchers" };

export default async function AdminVouchers() {
  await guardPage("products.write");
  const sb = supabaseService();
  let rows: VoucherRow[] = [];
  if (sb) {
    // two reads: vouchers, and the uses that still count (orders pending or paid)
    const [v, r] = await Promise.all([
      sb.from("vouchers").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("voucher_redemptions").select("voucher_code, discount_usd, orders!inner(status)").in("orders.status", ["pending", "paid"]).limit(10000),
    ]);
    const uses = new Map<string, { n: number; usd: number }>();
    for (const x of (r.data ?? []) as { voucher_code: string; discount_usd: number | string }[]) {
      const u = uses.get(x.voucher_code) ?? { n: 0, usd: 0 };
      u.n += 1; u.usd += Number(x.discount_usd);
      uses.set(x.voucher_code, u);
    }
    rows = ((v.data ?? []) as Omit<VoucherRow, "uses" | "discountGiven">[]).map((x) => ({ ...x, uses: uses.get(x.code)?.n ?? 0, discountGiven: uses.get(x.code)?.usd ?? 0 }));
  }
  const products = (await listProducts()).map((p) => ({ id: p.id, name: p.name }));
  return <VouchersManager rows={rows} products={products} live={Boolean(sb)} />;
}
