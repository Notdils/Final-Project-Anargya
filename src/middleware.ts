import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const NEEDS_LOGIN = [/^\/checkout/, /^\/account/, /^\/receipt\//, /^\/app$/, /^\/reset-password$/];
// Japanese pages live under /ja; rules are written for the unprefixed path.
const strip = (p: string) => (p === "/ja" ? "/" : p.startsWith("/ja/") ? p.slice(3) : p);
const NEEDS_ADMIN = [/^\/admin/, /^\/api\/admin\//];

export async function middleware(req: NextRequest) {
  const full = req.nextUrl.pathname;
  const ja = full === "/ja" || full.startsWith("/ja/");
  const path = strip(full);
  // Without Supabase (local UI review) every page renders with placeholder data.
  if (!URL_ || !KEY) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(URL_, KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser(); // validates the JWT with Supabase, refreshes cookies
  const user = data.user;
  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? (user ? "customer" : null);

  const redirect = (to: string) => {
    const u = req.nextUrl.clone();
    u.pathname = ja && !to.startsWith("/admin") ? (to === "/" ? "/ja" : `/ja${to}`) : to;
    u.search = to === "/login" ? `?next=${encodeURIComponent(full + req.nextUrl.search)}` : "";
    return NextResponse.redirect(u);
  };

  if (NEEDS_ADMIN.some((r) => r.test(path))) {
    if (!user) return path.startsWith("/api/") ? NextResponse.json({ error: "unauthorized" }, { status: 401 }) : redirect("/login");
    if (role !== "admin") return path.startsWith("/api/") ? NextResponse.json({ error: "forbidden" }, { status: 403 }) : redirect("/marketplace");
  }
  if (NEEDS_LOGIN.some((r) => r.test(path)) && !user) return redirect("/login");
  if (path === "/app") return redirect(role === "admin" ? "/admin" : "/marketplace");
  if ((path === "/login" || path === "/register") && user) return redirect(role === "admin" ? "/admin" : "/marketplace");

  return res;
}

export const config = {
  // Only routes that gate access or redirect signed-in users. Public pages skip this so they stay
  // static and make no Supabase round trip; the browser client keeps the session cookie fresh.
  matcher: [
    "/checkout/:path*",
    "/account/:path*",
    "/receipt/:path*",
    "/app",
    "/reset-password",
    "/admin/:path*",
    "/api/admin/:path*",
    "/login",
    "/register",
    "/ja/checkout/:path*",
    "/ja/account/:path*",
    "/ja/receipt/:path*",
    "/ja/reset-password",
    "/ja/login",
    "/ja/register",
  ],
};
