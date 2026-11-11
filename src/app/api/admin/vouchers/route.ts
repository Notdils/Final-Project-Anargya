import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

const money = z.number().min(0).max(100000).multipleOf(0.01);
const VoucherCreate = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "3 to 24 letters, digits or -."),
    description: z.string().trim().max(200).nullable(),
    kind: z.enum(["percent", "fixed"]),
    value: money.positive("Must be more than 0."),
    max_discount_usd: money.positive().nullable(),
    min_subtotal_usd: money,
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }).nullable(),
    max_uses: z.number().int().positive().nullable(),
    per_user_limit: z.number().int().min(1).max(100),
    product_ids: z.array(z.string().min(1).max(40)).max(50).nullable(),
  })
  .refine((v) => v.kind !== "percent" || v.value <= 100, { path: ["value"], message: "A percent cannot be over 100." })
  .refine((v) => !v.ends_at || Date.parse(v.ends_at) > Date.parse(v.starts_at), { path: ["ends_at"], message: "Must be after the start." });

/** Create a voucher (catalog / admin). Codes are unique and stored upper-case. */
export async function POST(req: Request) {
  const g = await guardApi("products.write");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const parsed = VoucherCreate.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const v = { ...parsed.data, product_ids: parsed.data.product_ids?.length ? parsed.data.product_ids : null };
  const { error } = await sb.from("vouchers").insert(v);
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That code already exists." : "Could not create the voucher." }, { status: error.code === "23505" ? 409 : 500 });
  await audit(g.user!, "voucher.create", v.code, v);
  return NextResponse.json({ ok: true });
}
