"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useCart } from "./cart";

const LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/about", label: "About", key: "about" },
  { href: "/marketplace", label: "Marketplace", key: "marketplace" },
] as const;

export function HeaderClient({
  variant,
  active,
  signedIn,
  isAdmin,
}: {
  variant: "solid" | "overlay";
  active?: string;
  signedIn: boolean;
  isAdmin: boolean;
}) {
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
  const accountHref = isAdmin ? "/admin" : signedIn ? "/account" : "/login";
  const accountLabel = isAdmin ? "Admin" : signedIn ? "Account" : "Log in";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[1100] transition-colors duration-200 ${
        dark ? "bg-transparent text-white" : "border-b border-line bg-white/95 text-ink backdrop-blur"
      }`}
    >
      <nav aria-label="Main" className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="text-base font-semibold tracking-[0.12em]">
          ANARGYA
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => {
            const on = active === l.key;
            return (
              <li key={l.key}>
                <Link
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative text-sm font-medium after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:bg-teal after:transition-opacity ${
                    on ? "after:opacity-100" : `after:opacity-0 ${dark ? "text-neutral-400 hover:text-white" : "text-muted hover:text-ink"}`
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            aria-label={`Cart, ${ready ? count : 0} items`}
            className={`btn px-2 ${dark ? "btn-outline-dark" : "btn-outline"}`}
          >
            <ShoppingCart size={16} aria-hidden />
            {ready && count > 0 && (
              <span className="rounded-lg bg-teal px-1.5 font-mono text-xs leading-4 text-white">{count}</span>
            )}
          </Link>
          <Link href={accountHref} className={`btn hidden md:inline-flex ${dark ? "btn-outline-dark" : "btn-outline"}`}>
            {accountLabel}
          </Link>
          <Link href="/marketplace" className={`btn hidden md:inline-flex ${dark ? "btn-teal" : "btn-ochre"}`}>
            Shop parts
          </Link>
          <button
            type="button"
            aria-label="Open menu"
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
        aria-label="Menu"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="text-base font-semibold tracking-[0.12em]">ANARGYA</span>
          <button type="button" className="btn btn-outline px-2" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={16} aria-hidden />
          </button>
        </div>
        <ul className="flex flex-col p-5">
          {LINKS.map((l) => (
            <li key={l.key}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block border-b border-line py-4 text-lg font-medium ${active === l.key ? "text-teal" : ""}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={accountHref} onClick={() => setOpen(false)} className="block border-b border-line py-4 text-lg font-medium">
              {accountLabel}
            </Link>
          </li>
        </ul>
        <div className="px-5">
          <Link href="/marketplace" onClick={() => setOpen(false)} className="btn btn-ochre btn-lg w-full">
            Shop parts
          </Link>
        </div>
      </dialog>
    </header>
  );
}
