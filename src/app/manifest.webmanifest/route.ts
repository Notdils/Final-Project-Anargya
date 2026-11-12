import type { MetadataRoute } from "next";

// Served as a route (not the app/manifest.ts convention) so the admin layout can point to its own
// manifest: the convention adds its <link> to every page and cannot be overridden.
export const dynamic = "force-static";

// Customer app. Staff install a separate app from the admin pages (public/staff.webmanifest),
// so nothing here mentions the admin area.
const MANIFEST: MetadataRoute.Manifest = {
  id: "/app",
  name: "Anargya Corp",
  short_name: "Anargya",
  description: "Formula EV parts, designed to race.",
  start_url: "/marketplace", // id stays "/app" so existing installs are the same app
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#000000",
  theme_color: "#000000",
  categories: ["shopping", "business"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  // Shown in the richer Android/desktop install dialog. Regenerate after big visual changes.
  screenshots: [
    { src: "/screenshots/home-narrow.webp", sizes: "824x1830", type: "image/webp", form_factor: "narrow", label: "3D car hero" },
    { src: "/screenshots/mkt-narrow.webp", sizes: "824x1830", type: "image/webp", form_factor: "narrow", label: "Featured parts" },
    { src: "/screenshots/home-wide.webp", sizes: "1280x800", type: "image/webp", form_factor: "wide", label: "3D car hero" },
    { src: "/screenshots/mkt-wide.webp", sizes: "1280x800", type: "image/webp", form_factor: "wide", label: "Featured parts" },
  ],
  shortcuts: [
    { name: "Marketplace", url: "/marketplace", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    { name: "Consulting", url: "/consulting", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
  ],
};

export function GET() {
  return new Response(JSON.stringify(MANIFEST), { headers: { "Content-Type": "application/manifest+json" } });
}
