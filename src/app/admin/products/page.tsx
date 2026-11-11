import { guardPage } from "@/lib/admin-guard";
import { listAllProducts } from "@/lib/admin-products";
import { ProductsManager } from "@/components/admin/products-manager";
import { can } from "@/lib/rbac";
import { hasSupabase } from "@/lib/env";

export const metadata = { title: "Products" };

export default async function AdminProducts() {
  const { role } = await guardPage("products.read");
  const products = await listAllProducts();
  return <ProductsManager products={products} canWrite={!hasSupabase || can(role, "products.write")} />;
}
