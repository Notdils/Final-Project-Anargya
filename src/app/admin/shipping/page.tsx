import { guardPage } from "@/lib/admin-guard";
import { allZones } from "@/lib/shipping-server";
import { listAllProducts } from "@/lib/admin-products";
import { ShippingManager } from "@/components/admin/shipping-manager";

export const metadata = { title: "Shipping Cost" };

export default async function AdminShipping() {
  await guardPage("shipping.manage");
  const [data, products] = await Promise.all([allZones(), listAllProducts()]);
  // Columns: active parts, plus any part that already has a rate.
  const rated = new Set(data.regions.flatMap((r) => Object.keys(r.rates)));
  const parts = products.filter((p) => p.active || rated.has(p.id)).map((p) => ({ id: p.id, name: p.name, code: p.code }));
  return <ShippingManager {...data} parts={parts} />;
}
