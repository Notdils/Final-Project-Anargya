import { guardPage } from "@/lib/admin-guard";
import { allZones } from "@/lib/shipping-server";
import { ShippingManager } from "@/components/admin/shipping-manager";

export const metadata = { title: "Shipping" };

export default async function AdminShipping() {
  await guardPage("shipping.manage");
  const data = await allZones();
  return <ShippingManager {...data} />;
}
