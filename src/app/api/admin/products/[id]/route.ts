import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { ProductPatch, toColumns } from "../schema";

/** Update a product. Changes are live on the marketplace right away (cached pages are refreshed). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("products.write");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!/^[a-z0-9-]{3,60}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const parsed = ProductPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0)
    return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.success ? {} : parsed.error.flatten().fieldErrors }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { data, error } = await sb.from("products").update(toColumns(parsed.data)).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  await audit(g.user!, "product.update", id, parsed.data);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
