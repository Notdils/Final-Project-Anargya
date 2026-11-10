import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fxJpyIdr } from "@/lib/env";
import { createSnap, hasMidtrans } from "@/lib/midtrans";

const Body = z.object({
  items: z.array(z.object({ id: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) })).min(1).max(20),
  contact: z.object({
    email: z.string().email().max(120),
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/),
    address: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(80),
    postal: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/),
    country: z.string().trim().min(2).max(56),
  }),
});

export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to check out." }, { status: 401 });

  const ip = await clientIp();
  if (!(await rateLimit(`order:${user.id}`, 5, 600)) || !(await rateLimit(`order-ip:${ip}`, 10, 600)))
    return NextResponse.json({ error: "Too many checkout attempts. Try again in 10 minutes." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const fx = fxJpyIdr();
  if (!fx || !hasMidtrans()) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });

  // merge duplicate lines
  const merged = Object.values(
    parsed.data.items.reduce<Record<string, { id: string; qty: number }>>((acc, it) => {
      acc[it.id] = { id: it.id, qty: Math.min(20, (acc[it.id]?.qty ?? 0) + it.qty) };
      return acc;
    }, {}),
  );

  const sb = (await supabaseServer())!;
  const shipping = Math.max(0, Number(process.env.SHIPPING_FLAT_JPY) || 0);
  const { data, error } = await sb.rpc("create_order", { p_items: merged, p_contact: parsed.data.contact, p_shipping_jpy: shipping, p_fx: fx });
  if (error || !data?.[0]) {
    const msg = /insufficient stock/i.test(error?.message ?? "") ? "One of the parts just went out of stock. Update your cart." : "Could not create the order.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  const order = data[0] as { order_id: string; receipt_no: string; total_jpy: number; charged_idr: number };

  try {
    const origin = new URL(req.url).origin;
    const snap = await createSnap({
      orderId: order.order_id,
      grossIdr: Number(order.charged_idr),
      customer: { name: parsed.data.contact.name, email: parsed.data.contact.email, phone: parsed.data.contact.phone },
      finishUrl: `${origin}/receipt/${order.order_id}`,
    });
    return NextResponse.json({ orderId: order.order_id, token: snap.token, redirectUrl: snap.redirect_url });
  } catch {
    return NextResponse.json({ error: "Payment gateway unavailable. Your order was saved as pending.", orderId: order.order_id }, { status: 502 });
  }
}
