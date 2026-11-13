import { NextResponse } from "next/server";
import { guardApi } from "@/lib/admin-guard";
import { listProducts } from "@/lib/catalog";

/** Products staff can send as a card in the chat (active catalog only). */
export async function GET() {
  const g = await guardApi("support.reply");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const all = await listProducts();
  return NextResponse.json({ products: all.map((p) => ({ slug: p.slug, code: p.code, name: p.name, priceUsd: p.priceUsd, image: p.image, stock: p.stock })) });
}
