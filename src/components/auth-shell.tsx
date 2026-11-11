"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, type ReactNode } from "react";
import { useLp, useT } from "@/i18n/client";
import { BrandMark } from "@/components/brand-mark";

const HeroScene = dynamic(() => import("@/components/home/hero-scene"), { ssr: false });

// No WebGL (old device, blocked GPU): show nothing rather than crash the login page.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

// Desktop: brand stage left, form right. Tablet: stage on top. Mobile: slim black header.
export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const L = useLp();
  return (
    <div className="flex min-h-svh flex-col xl:flex-row">
      <aside aria-hidden className="relative hidden h-[360px] overflow-hidden bg-stage text-white md:block xl:h-auto xl:w-1/2">
        <Link href={L("/")} className="absolute left-10 top-8 z-10 flex items-center gap-2 text-base font-semibold tracking-[0.12em]" tabIndex={-1}><BrandMark />ANARGYA</Link>
        {/* E21 car, same scene as the home hero; slow auto-rotate, drag to orbit */}
        <div className="absolute inset-x-6 bottom-28 top-20 xl:inset-x-10">
          <SceneBoundary><HeroScene rotating active /></SceneBoundary>
        </div>
        <p className="pointer-events-none absolute bottom-10 left-10 text-[32px] font-semibold leading-10 tracking-[-0.02em]">{t("Parts and consulting")}<br />{t("for Formula EV teams.")}</p>
      </aside>
      <header className="bg-stage px-5 py-5 md:hidden">
        <Link href={L("/")} className="flex items-center gap-2 text-base font-semibold tracking-[0.12em] text-white"><BrandMark />ANARGYA</Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 py-8 md:py-16">
        <div className="w-full max-w-[420px] xl:max-w-[384px]">{children}</div>
      </main>
    </div>
  );
}
