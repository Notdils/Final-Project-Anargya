import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseService } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SLOTS, TOPICS, isBookableDate } from "@/lib/booking";
import { consultFeeUsd, fxUsdIdr } from "@/lib/env";
import { BOOKING_PAY_WINDOW_MIN, createSnap, hasMidtrans } from "@/lib/midtrans";

const Body = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, "Enter a valid phone number."),
  organisation: z.string().trim().min(2, "Enter your team or company.").max(120),
  topic: z.enum(TOPICS.map((t) => t.id) as [string, ...string[]], { error: "Choose a topic." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  time: z.enum(SLOTS, { error: "Choose a time." }),
  message: z.string().trim().max(1000).optional().default(""),
  locale: z.enum(["en", "ja"]).optional(),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

/** Book a consultation and open a Midtrans payment for it. The slot is held while payment is pending. */
export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to book.", login: true }, { status: 401 });

  const ip = await clientIp();
  if (!(await rateLimit(`booking-ip:${ip}`, 10, 3600)) || !(await rateLimit(`booking-ip-day:${ip}`, 20, 86400)) || !(await rateLimit(`booking-user:${user.id}`, 5, 3600)))
    return NextResponse.json({ error: "Too many booking requests from this network. Try again later." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const b = parsed.data;
  if (!isBookableDate(b.date)) return NextResponse.json({ error: "Choose a weekday within the next 30 days.", fields: { date: ["Not available."] } }, { status: 400 });

  const fee = consultFeeUsd();
  const fx = fxUsdIdr();
  const sb = supabaseService();
  if (!sb || !fee || !fx || !hasMidtrans()) return NextResponse.json({ error: "Booking is not configured yet." }, { status: 503 });
  const chargedIdr = Math.ceil(fee * fx);

  const { data, error } = await sb
    .from("bookings")
    .insert({
      user_id: user.id, name: b.name, email: b.email, phone: b.phone, organisation: b.organisation, topic: b.topic,
      slot_date: b.date, slot_time: b.time, message: b.message || null,
      fee_usd: fee, fx_usd_idr: fx, charged_idr: chargedIdr, pay_status: "pending",
      pay_expires_at: new Date(Date.now() + BOOKING_PAY_WINDOW_MIN * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505" && /one_pending/.test(error.message)) {
      // one unpaid booking per customer (0009): send them back to it
      const { data: open } = await sb.from("bookings").select("id").eq("user_id", user.id).eq("pay_status", "pending").maybeSingle();
      return NextResponse.json({ error: "You already have a booking waiting for payment.", pendingId: open?.id ?? null }, { status: 409 });
    }
    if (error.code === "23505") return NextResponse.json({ error: "That time was just taken. Pick another one.", taken: true }, { status: 409 });
    return NextResponse.json({ error: "Could not save the booking. Try again." }, { status: 500 });
  }

  try {
    const origin = new URL(req.url).origin;
    const snap = await createSnap({
      orderId: data.id,
      grossIdr: chargedIdr,
      customer: { name: b.name, email: b.email, phone: b.phone },
      finishUrl: `${origin}${b.locale === "ja" ? "/ja" : ""}/consulting/booking/${data.id}`,
      expiryMin: BOOKING_PAY_WINDOW_MIN,
    });
    await sb.from("bookings").update({ snap_token: snap.token, snap_redirect_url: snap.redirect_url }).eq("id", data.id);
    return NextResponse.json({ id: data.id, token: snap.token, redirectUrl: snap.redirect_url });
  } catch {
    // free the slot again: nothing can be paid for this booking
    await sb.from("bookings").update({ status: "cancelled", pay_status: "failed" }).eq("id", data.id);
    return NextResponse.json({ error: "Payment gateway unavailable. Try again in a moment." }, { status: 502 });
  }
}
