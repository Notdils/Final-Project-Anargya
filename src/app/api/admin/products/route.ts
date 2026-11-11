import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { ProductCreate } from "./schema";

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Create a product. It starts hidden (inactive) so it can be completed before going live. */
export async function POST(req: Request) {
  const g = await guardApi("products.write");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const parsed = ProductCreate.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const p = parsed.data;
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const slug = slugify(p.name);
  const id = `p-${slugify(p.code)}`;
  const { error } = await sb.from("products").insert({
    id, slug, code: p.code, name: p.name, category: p.category, price_usd: p.priceUsd, unit: p.unit, stock: p.stock, active: false, featured: false,
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That code or name is already used." }, { status: 409 });
    return NextResponse.json({ error: "Could not create the product." }, { status: 500 });
  }
  await audit(g.user!, "product.create", id, p);
  revalidatePath("/", "layout");
  return NextResponse.json({ id });
}
