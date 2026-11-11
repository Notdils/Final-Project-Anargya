import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { PLACEHOLDER_PRODUCTS, type Category } from "@/lib/data";

export type AdminProduct = {
  id: string; slug: string; code: string; name: string; category: Category; price_usd: number; unit: string;
  stock: number; active: boolean; featured: boolean; image_url: string | null; model_url: string | null;
  lead_time: string | null; material: string | null; weight: string | null; dimensions: string | null; fits: string | null; finish: string | null; description: string | null; overview: string | null;
};

/** Every sellable product, hidden ones included (RLS: products.read). */
export async function listAllProducts(): Promise<AdminProduct[]> {
  const sb = await supabaseServer();
  if (!sb)
    return PLACEHOLDER_PRODUCTS.map((p) => ({
      id: p.id, slug: p.slug, code: p.code, name: p.name, category: p.category, price_usd: p.priceUsd, unit: p.unit, stock: p.stock, active: true, featured: p.featured,
      image_url: p.image, model_url: p.modelUrl, lead_time: null, material: null, weight: null, dimensions: null, fits: null, finish: null, description: p.description, overview: p.overview,
    }));
  const { data } = await sb
    .from("products")
    .select("id, slug, code, name, category, price_usd, unit, stock, active, featured, image_url, model_url, lead_time, material, weight, dimensions, fits, finish, description, overview")
    .not("price_usd", "is", null)
    .order("code");
  return ((data ?? []) as AdminProduct[]).map((p) => ({ ...p, price_usd: Number(p.price_usd) }));
}
