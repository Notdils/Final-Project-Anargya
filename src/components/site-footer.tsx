"use client";
import Link from "next/link";
import { useLp, useT } from "@/i18n/client";

export function SiteFooter() {
  const t = useT();
  const L = useLp();
  return (
    <footer className="overflow-hidden bg-teal text-white">
      <div className="container-x flex flex-col gap-8 pt-12 md:gap-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <nav aria-label={t("Footer")}>
            <ul className="flex flex-col gap-4 text-sm md:flex-row md:gap-6">
              <li><Link href={L("/")} className="hover:underline">{t("Home")}</Link></li>
              <li><Link href={L("/about")} className="hover:underline">{t("About")}</Link></li>
              <li><Link href={L("/marketplace")} className="hover:underline">{t("Marketplace")}</Link></li>
              <li><Link href={L("/consulting")} className="hover:underline">{t("Consulting")}</Link></li>
              <li><Link href={L("/login")} className="hover:underline">{t("Log in")}</Link></li>
            </ul>
          </nav>
          <p className="text-sm text-white/90">© 2026 Anargya Corp.</p>
        </div>
        <p
          aria-hidden
          className="select-none text-center font-semibold leading-none tracking-[-0.04em] text-[19.5vw] xl:text-[256px]"
        >
          ANARGYA
        </p>
      </div>
    </footer>
  );
}

export function SlimFooter() {
  return (
    <footer className="bg-teal text-white">
      <div className="container-x flex items-center justify-between py-6">
        <span className="text-sm font-semibold tracking-[0.12em]">ANARGYA</span>
        <span className="text-xs text-white/90">© 2026 Anargya Corp.</span>
      </div>
    </footer>
  );
}
