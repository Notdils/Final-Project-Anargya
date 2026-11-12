import type { NextConfig } from "next";

// Report-only for now: logs violations in the browser console without blocking, so Midtrans Snap and
// the 3D viewer can be checked before switching the header name to Content-Security-Policy.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://app.sandbox.midtrans.com https://app.midtrans.com https://api.sandbox.midtrans.com https://api.midtrans.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${supabase} https://*.midtrans.com https://www.gstatic.com`,
  "frame-src https://*.midtrans.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.midtrans.com",
  "frame-ancestors 'none'",
].join("; ");

const supabaseHost = (() => { try { return new URL(supabase).hostname; } catch { return null; } })();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Put metadata in <head> for every browser, not streamed into <body> on dynamic pages: Chrome only
  // reads <link rel="manifest"> from <head>, so admin and account pages were not installable.
  htmlLimitedBots: /.*/,
  // product renders uploaded from the admin live in the Supabase Storage bucket "part-media"
  images: supabaseHost ? { remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/part-media/**" }] } : undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/models/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};

export default nextConfig;
