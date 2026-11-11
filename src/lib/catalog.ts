import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasSupabase } from "@/lib/env";
import { PLACEHOLDER_PRODUCTS, type Product } from "@/lib/data";

// The catalog is public (RLS: active products are readable by anyone), so it is read with a
// session-less client. This works at build time (generateStaticParams) and keeps pages cacheable.
const publicClient = () =>
  hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

type Row = {
  id: string; slug: string; code: string; name: string; category: Product["category"];
  price_usd: number | string | null; unit: string | null; image_url: string | null; stock: number; lead_time: string | null; material: string | null; weight: string | null;
  dimensions: string | null; fits: string | null; finish: string | null; description: string | null; overview?: string | null;
  featured: boolean; model_url: string | null;
};

const PH = "[PLACEHOLDER]";
const toProduct = (r: Row): Product => ({
  id: r.id, slug: r.slug, code: r.code, name: r.name, category: r.category, priceUsd: Number(r.price_usd), unit: r.unit ?? "unit", image: r.image_url,
  stock: r.stock, leadTime: r.lead_time ?? PH, material: r.material ?? PH, weight: r.weight ?? PH,
  dimensions: r.dimensions ?? PH, fits: r.fits ?? PH, finish: r.finish ?? PH,
  description: r.description ?? PH, overview: r.overview ?? r.description ?? PH, featured: r.featured, modelUrl: r.model_url,
});

export async function listProducts(): Promise<Product[]> {
  const sb = publicClient();
  if (!sb) return PLACEHOLDER_PRODUCTS;
  const { data, error } = await sb.from("products").select("*").eq("active", true).not("price_usd", "is", null).order("code");
  if (error || !data) return PLACEHOLDER_PRODUCTS;
  return (data as Row[]).map(toProduct);
}

export async function getProduct(slug: string): Promise<Product | null> {
  const all = await listProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
