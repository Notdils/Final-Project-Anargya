import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { countryName, quote } from "@/lib/shipping";
import { shippingData } from "@/lib/shipping-server";

// Same rules as the address at checkout (api/orders).
const Body = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, "Enter a valid phone number."),
  address: z.string().trim().min(5, "Enter the street address.").max(200),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  postal: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/, "Enter a valid postal code."),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/, "Choose a country."),
  note: z.string().trim().max(300, "Keep it under 300 characters.").regex(/^[^\u0000-\u0009\u000b-\u001f\u007f]*$/, "Remove special characters.")
    .refine((s) => !/http:\/\//i.test(s), "Use a link that starts with https://.").optional().nullable(),
});

/** Save or edit the shipping address (Account). Stored in the user's own profile, like the checkout option. */
export async function PUT(req: Request) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const a = parsed.data;
  // Only destinations we ship to.
  const q = quote(await shippingData(), a.country, []);
  if (!q.ok) return NextResponse.json({ error: q.error, fields: { [q.field]: [q.error] } }, { status: 400 });
  const sb = (await supabaseServer())!;
  const { error } = await sb.auth.updateUser({ data: { shipping_address: {
    buyer_name: a.name, phone: a.phone, address: a.address, city: a.city, postal_code: a.postal, country: countryName(q.country, "en"),
    ship_country: q.country, ship_region: q.region, address_note: a.note || null,
  } } });
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Forget the saved shipping address (checkout will ask again). */
export async function DELETE() {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });
  const sb = (await supabaseServer())!;
  const { error } = await sb.auth.updateUser({ data: { shipping_address: null } });
  if (error) return NextResponse.json({ error: "Could not remove it. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
