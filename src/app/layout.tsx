import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { CartProvider } from "@/components/cart";
import { Tracker } from "@/components/tracker";
import { SwRegister } from "@/components/sw-register";
import { LocaleProvider } from "@/i18n/client";

export const metadata: Metadata = {
  title: { default: "Anargya Corp", template: "%s · Anargya Corp" },
  description: "Formula EV parts, designed to race. Engineering-led, partner-built.",
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
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
          Skip to content
        </a>
        <LocaleProvider><CartProvider>{children}</CartProvider></LocaleProvider>
        <Tracker />
        <SwRegister />
      </body>
    </html>
  );
}
