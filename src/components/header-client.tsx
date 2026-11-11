"use client";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CurrencySwitch } from "@/components/currency";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Languages, Menu, ShoppingCart, X } from "lucide-react";
import { useLocale, useLp, useT } from "@/i18n/client";
import { lp, splitLocale } from "@/i18n";
import { useCart } from "./cart";
import { useAuth } from "./auth-state";

const LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/about", label: "About", key: "about" },
  { href: "/marketplace", label: "Marketplace", key: "marketplace" },
  { href: "/consulting", label: "Consulting", key: "consulting" },
] as const;

export function HeaderClient({
  variant,
  active,
}: {
  variant: "solid" | "overlay";
  active?: string;
}) {
  const { ready: authReady, signedIn, isAdmin } = useAuth();
  const t = useT();
  const L = useLp();
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const other = locale === "en" ? "ja" : "en";
  const switchHref = lp(splitLocale(pathname).path, other);
  const { count, ready } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (variant !== "overlay") return;
    const on = () => setScrolled(scrollY > 24);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, [variant]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const dark = variant === "overlay" && !scrolled;
  const accountHref = isAdmin ? "/app" : L(signedIn ? "/account" : "/login");
  const accountLabel = t(isAdmin ? "Admin" : signedIn ? "Account" : "Log in");

  return (
    <header
      data-dark={dark ? "" : undefined}
      className={`fixed inset-x-0 top-0 z-[1100] transition-colors duration-200 ${
        dark ? "bg-transparent text-white" : "border-b border-line bg-white/95 text-ink backdrop-blur"
      }`}
    >
      <nav aria-label={t("Main")} className="container-x flex h-16 items-center justify-between">
        <Link href={L("/")} className="flex items-center gap-2 text-base font-semibold tracking-[0.12em]">
          <BrandMark />
          ANARGYA
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => {
            const on = active === l.key;
            return (
              <li key={l.key}>
                <Link
                  href={L(l.href)}
                  aria-current={on ? "page" : undefined}
                  className={`relative text-sm font-medium after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:bg-teal after:transition-opacity ${
                    on ? "after:opacity-100" : `after:opacity-0 ${dark ? "text-neutral-400 hover:text-white" : "text-muted hover:text-ink"}`
                  }`}
                >
                  {t(l.label)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <CurrencySwitch className={`btn hidden p-0 md:inline-flex ${dark ? "btn-outline-dark" : "btn-outline"}`} />
          <a
            href={switchHref}
            hrefLang={other}
            lang={other}
            aria-label={other === "ja" ? "日本語に切り替え" : "Switch to English"}
            className={`btn px-2 font-mono text-xs ${dark ? "btn-outline-dark" : "btn-outline"}`}
          >
            <Languages size={16} aria-hidden />
            <span>{other === "ja" ? "日本語" : "EN"}</span>
          </a>
          <Link
            href={L("/cart")}
            aria-label={t("Cart, {n} items", { n: ready ? count : 0 })}
            className={`btn px-2 ${dark ? "btn-outline-dark" : "btn-outline"}`}
          >
            <ShoppingCart size={16} aria-hidden />
            {ready && count > 0 && (
              <span className="rounded-lg bg-teal px-1.5 font-mono text-xs leading-4 text-white">{count}</span>
            )}
          </Link>
          <Link href={accountHref} className={`btn hidden md:inline-flex ${dark ? "btn-outline-dark" : "btn-outline"} ${authReady ? "" : "invisible"}`}>
            {accountLabel}
          </Link>
          <Link href={L("/marketplace")} className="btn btn-teal hidden md:inline-flex">
            {t("Shop parts")}
          </Link>
          <button
            type="button"
            aria-label={t("Open menu")}
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className={`btn px-2 md:hidden ${dark ? "btn-outline-dark" : "btn-outline"}`}
          >
            <Menu size={16} aria-hidden />
          </button>
        </div>
      </nav>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-0 ml-auto h-dvh max-h-none w-[min(320px,85vw)] bg-white p-0 text-ink backdrop:bg-black/50"
        aria-label={t("Menu")}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="flex items-center gap-2 text-base font-semibold tracking-[0.12em]"><BrandMark />ANARGYA</span>
          <button type="button" className="btn btn-outline px-2" aria-label={t("Close menu")} onClick={() => setOpen(false)}>
            <X size={16} aria-hidden />
          </button>
        </div>
        <ul className="flex flex-col p-5">
          {LINKS.map((l) => (
            <li key={l.key}>
              <Link
                href={L(l.href)}
                onClick={() => setOpen(false)}
                className={`block border-b border-line py-4 text-lg font-medium ${active === l.key ? "text-teal" : ""}`}
              >
                {t(l.label)}
              </Link>
            </li>
          ))}
          <li>
            <Link href={accountHref} onClick={() => setOpen(false)} className="block border-b border-line py-4 text-lg font-medium">
              {accountLabel}
            </Link>
          </li>
        </ul>
        <div className="flex flex-col gap-3 px-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">{t("Currency")}</span>
            <CurrencySwitch className="btn btn-outline p-0" />
          </div>
          <Link href={L("/marketplace")} onClick={() => setOpen(false)} className="btn btn-teal btn-lg w-full">
            {t("Shop parts")}
          </Link>
        </div>
      </dialog>
    </header>
  );
}
