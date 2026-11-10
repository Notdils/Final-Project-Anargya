import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { PLACEHOLDER_PRODUCTS, type Product } from "@/lib/data";

type Row = {
  id: string; slug: string; code: string; name: string; category: Product["category"];
  price_jpy: number; stock: number; lead_time: string | null; material: string | null; weight: string | null;
  dimensions: string | null; fits: string | null; finish: string | null; description: string | null;
  featured: boolean; model_url: string | null;
};

const PH = "[PLACEHOLDER]";
const toProduct = (r: Row): Product => ({
  id: r.id, slug: r.slug, code: r.code, name: r.name, category: r.category, priceJpy: r.price_jpy,
  stock: r.stock, leadTime: r.lead_time ?? PH, material: r.material ?? PH, weight: r.weight ?? PH,
  dimensions: r.dimensions ?? PH, fits: r.fits ?? PH, finish: r.finish ?? PH,
  description: r.description ?? PH, featured: r.featured, modelUrl: r.model_url,
});

export async function listProducts(): Promise<Product[]> {
  const sb = await supabaseServer();
  if (!sb) return PLACEHOLDER_PRODUCTS;
  const { data, error } = await sb.from("products").select("*").eq("active", true).order("code");
  if (error || !data) return PLACEHOLDER_PRODUCTS;
  return (data as Row[]).map(toProduct);
}

export async function getProduct(slug: string): Promise<Product | null> {
  const all = await listProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
