import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseService } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  code: z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9-]+$/),
  items: z.array(z.object({ id: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) })).min(1).max(20),
});

/** Checkout preview of a voucher. Same rules as order creation (voucher_discount in SQL 0016); the order re-checks them. */
export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in to use a voucher." }, { status: 401 });
  // slows down guessing codes
  if (!(await rateLimit(`voucher:${user.id}`, 10, 600))) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "This code is not valid." }, { status: 400 });
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Vouchers are not available yet." }, { status: 503 });
  const { data, error } = await sb.rpc("voucher_discount", { p_user: user.id, p_code: parsed.data.code, p_items: parsed.data.items });
  const v = /^voucher: (.*)$/.exec(error?.message ?? "");
  if (error || !data?.[0]) return NextResponse.json({ error: v?.[1] ?? "This code is not valid." }, { status: 400 });
  const row = data[0] as { code: string; discount_usd: number | string };
  return NextResponse.json({ code: row.code, discountUsd: Number(row.discount_usd) });
}
