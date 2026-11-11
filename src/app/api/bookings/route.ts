import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseService } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SLOTS, TOPICS, isBookableDate } from "@/lib/booking";

const Body = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(120),
  organisation: z.string().trim().min(2, "Enter your team or company.").max(120),
  topic: z.enum(TOPICS.map((t) => t.id) as [string, ...string[]], { error: "Choose a topic." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  time: z.enum(SLOTS, { error: "Choose a time." }),
  message: z.string().trim().max(1000).optional().default(""),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export async function POST(req: Request) {
  const ip = await clientIp();
  if (!(await rateLimit(`booking-ip:${ip}`, 5, 3600)))
    return NextResponse.json({ error: "Too many booking requests from this network. Try again later." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const b = parsed.data;
  if (!isBookableDate(b.date)) return NextResponse.json({ error: "Choose a weekday within the next 30 days.", fields: { date: ["Not available."] } }, { status: 400 });
  if (!(await rateLimit(`booking-email:${b.email.toLowerCase()}`, 3, 86400)))
    return NextResponse.json({ error: "You already have booking requests in today. We will reply by email." }, { status: 429 });

  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Booking is not configured yet." }, { status: 503 });
  const { user } = await currentUser();
  const { data, error } = await sb
    .from("bookings")
    .insert({ user_id: user?.id ?? null, name: b.name, email: b.email, organisation: b.organisation, topic: b.topic, slot_date: b.date, slot_time: b.time, message: b.message || null })
    .select("id, slot_date, slot_time")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That time was just taken. Pick another one.", taken: true }, { status: 409 });
    return NextResponse.json({ error: "Could not save the booking. Try again." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, date: data.slot_date, time: data.slot_time });
}
