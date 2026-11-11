import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseService } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fxUsdIdr } from "@/lib/env";
import { countryName, quote } from "@/lib/shipping";
import { shippingData } from "@/lib/shipping-server";
import { PAY_WINDOW_MIN, createSnap, hasMidtrans } from "@/lib/midtrans";

const Body = z.object({
  items: z.array(z.object({ id: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) })).min(1).max(20),
  contact: z.object({
    email: z.string().email().max(120),
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/),
    address: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(80),
    postal: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/),
    country: z.string().trim().regex(/^[A-Za-z]{2}$/, "Choose a country."),
    region: z.enum(["JP-EAST", "JP-WEST"]).optional().nullable(),
    // optional delivery notes or a map link; no control characters, links must be https
    note: z.string().trim().max(300, "Keep it under 300 characters.").regex(/^[^\u0000-\u0009\u000b-\u001f\u007f]*$/, "Remove special characters.")
      .refine((s) => !/http:\/\//i.test(s), "Use a link that starts with https://.").optional().nullable(),
  }),
  locale: z.enum(["en", "ja"]).optional(),
});

export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to check out." }, { status: 401 });

  const ip = await clientIp();
  if (!(await rateLimit(`order:${user.id}`, 5, 600)) || !(await rateLimit(`order-ip:${ip}`, 10, 600)))
    return NextResponse.json({ error: "Too many checkout attempts. Try again in 10 minutes." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const fx = fxUsdIdr();
  if (!fx || !hasMidtrans()) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });

  // merge duplicate lines
  const merged = Object.values(
    parsed.data.items.reduce<Record<string, { id: string; qty: number }>>((acc, it) => {
      acc[it.id] = { id: it.id, qty: Math.min(20, (acc[it.id]?.qty ?? 0) + it.qty) };
      return acc;
    }, {}),
  );

  // Shipping comes from the destination's zone in the database (0013), never from the client.
  const q = quote(await shippingData(), parsed.data.contact.country, parsed.data.contact.region);
  if (!q.ok) return NextResponse.json({ error: q.error, fields: { [q.field]: [q.error] } }, { status: 400 });
  const c = parsed.data.contact;
  const contact = { email: c.email, name: c.name, phone: c.phone, address: c.address, city: c.city, postal: c.postal, country: countryName(q.country, "en") };

  // Server-only RPC (0009): rate and shipping are decided here, never by the client.
  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  const { data, error } = await sb.rpc("create_order_usd_srv", { p_user: user.id, p_items: merged, p_contact: contact, p_shipping_usd: q.shippingUsd, p_fx_usd_idr: fx });
  if (error || !data?.[0]) {
    const msg = /insufficient stock/i.test(error?.message ?? "") ? "One of the parts just went out of stock. Update your cart." : "Could not create the order.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  const order = data[0] as { order_id: string; receipt_no: string; total_usd: number; charged_idr: number };
  await sb.from("orders").update({ ship_country: q.country, ship_region: q.region, shipping_zone: q.zone.code, address_note: c.note || null }).eq("id", order.order_id);

  try {
    const origin = new URL(req.url).origin;
    const snap = await createSnap({
      orderId: order.order_id,
      grossIdr: Number(order.charged_idr),
      customer: { name: parsed.data.contact.name, email: parsed.data.contact.email, phone: parsed.data.contact.phone },
      finishUrl: `${origin}${parsed.data.locale === "ja" ? "/ja" : ""}/receipt/${order.order_id}`,
    });
    // Kept so the buyer can resume from the receipt if they close the popup.
    await supabaseService()
      ?.from("orders")
      .update({ snap_token: snap.token, snap_redirect_url: snap.redirect_url, pay_expires_at: new Date(Date.now() + PAY_WINDOW_MIN * 60_000).toISOString() })
      .eq("id", order.order_id);
    return NextResponse.json({ orderId: order.order_id, token: snap.token, redirectUrl: snap.redirect_url });
  } catch {
    return NextResponse.json({ error: "Payment gateway unavailable. Your order was saved as pending.", orderId: order.order_id }, { status: 502 });
  }
}
