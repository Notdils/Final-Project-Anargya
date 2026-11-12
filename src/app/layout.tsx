import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { CartProvider } from "@/components/cart";
import { Suspense } from "react";
import { RouteProgress } from "@/components/route-progress";
import { SwRegister } from "@/components/sw-register";
import { LocaleProvider } from "@/i18n/client";
import { CurrencyProvider } from "@/components/currency";
import { FX_USD_JPY } from "@/lib/money";
import { fxUsdIdr } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Anargya Corp", template: "%s · Anargya Corp" },
  description: "Formula EV parts and engineering consulting from Japan.",
  applicationName: "Anargya Corp",
  appleWebApp: { capable: true, title: "Anargya", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-white text-ink">
        {/* keyboard users only: appears on the first Tab, just below the header so it covers nothing */}
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[72px] focus:z-[2000] focus:inline-flex focus:h-10 focus:items-center focus:rounded-lg focus:border focus:border-line focus:bg-white focus:px-4 focus:text-sm focus:font-medium focus:text-ink focus:shadow-md focus:outline-offset-0">
          Skip to content
        </a>
        {/* useSearchParams needs a Suspense boundary so static pages stay static */}
        <Suspense fallback={null}><RouteProgress /></Suspense>
        <LocaleProvider><CurrencyProvider rates={{ JPY: FX_USD_JPY, IDR: fxUsdIdr() }}><CartProvider>{children}</CartProvider></CurrencyProvider></LocaleProvider>
        <SwRegister />
      </body>
    </html>
  );
}
