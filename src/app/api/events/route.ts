import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  sid: z.string().regex(/^[a-f0-9]{16,64}$/),
  path: z.string().regex(/^\/($|about$|marketplace(\/[a-z0-9-]{1,80})?$|cart$|checkout$)/),
});

export async function POST(req: Request) {
  const ip = await clientIp();
  if (!(await rateLimit(`ev:${ip}`, 60, 60))) return new NextResponse(null, { status: 429 });
  let json: unknown;
  try {
    json = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const sb = supabaseService();
  if (sb) await sb.from("events").insert({ session_id: parsed.data.sid, type: "page_view", path: parsed.data.path });
  return new NextResponse(null, { status: 204 });
}
