import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Landing point for Supabase email links (password reset, email confirmation).
// Add https://<domain>/auth/callback to Supabase Auth -> URL Configuration -> Redirect URLs.
const ALLOWED_NEXT = new Set(["/reset-password", "/marketplace", "/login"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/marketplace";
  const target = ALLOWED_NEXT.has(next) ? next : "/marketplace";
  const sb = await supabaseServer();
  if (code && sb) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
