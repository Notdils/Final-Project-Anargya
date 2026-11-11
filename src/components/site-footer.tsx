"use client";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { useLp, useT } from "@/i18n/client";
import { BrandMark } from "@/components/brand-mark";
import { CONTACT } from "@/lib/contact";

// simple glyphs (lucide has no brand icons)
const Linkedin = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="6.5" y="10" width="2.5" height="7.5" /><circle cx="7.75" cy="7" r="1.5" /><path d="M11 10h2.4v1.1c.5-.8 1.4-1.3 2.6-1.3 2 0 3 1.2 3 3.6v4.1h-2.5v-3.8c0-1.1-.4-1.7-1.3-1.7-1 0-1.7.7-1.7 1.9v3.6H11z" /></svg>
);
const Instagram = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" /></svg>
);

export function SiteFooter() {
  const t = useT();
  const L = useLp();
  const head = "eyebrow mb-4 text-white/70";
  const link = "hover:underline";
  return (
    <footer className="overflow-hidden bg-teal text-white">
      <div className="container-x flex flex-col gap-10 pt-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.4fr] md:gap-8">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-base font-semibold tracking-[0.12em]"><BrandMark />ANARGYA</span>
            <p className="max-w-xs text-sm text-white/90">{t("Formula EV parts and engineering consulting, designed in Japan.")}</p>
            <p className="flex items-start gap-2 text-sm text-white/90"><MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />{CONTACT.address}</p>
          </div>
          <nav aria-label={t("Footer")}>
            <p className={head}>{t("Explore")}</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li><Link href={L("/")} className={link}>{t("Home")}</Link></li>
              <li><Link href={L("/about")} className={link}>{t("About")}</Link></li>
              <li><Link href={L("/marketplace")} className={link}>{t("Marketplace")}</Link></li>
              <li><Link href={L("/consulting")} className={link}>{t("Consulting")}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t("Customer")}>
            <p className={head}>{t("Customer")}</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li><Link href={L("/account")} className={link}>{t("My account")}</Link></li>
              <li><Link href={L("/cart")} className={link}>{t("Cart")}</Link></li>
              <li><Link href={L("/consulting")} className={link}>{t("Book a consultation")}</Link></li>
            </ul>
          </nav>
          <div>
            <p className={head}>{t("Contact")}</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-start gap-2"><UserRound size={16} className="mt-0.5 shrink-0" aria-hidden /><span>{CONTACT.person.name}<span className="block text-white/70">{t(CONTACT.person.role)}</span></span></li>
              <li><a href={`mailto:${CONTACT.email}`} className={`flex items-center gap-2 ${link} [overflow-wrap:anywhere]`}><Mail size={16} className="shrink-0" aria-hidden />{CONTACT.email}</a></li>
              <li><a href={`tel:${CONTACT.person.phone.replace(/[^+\d]/g, "")}`} className={`flex items-center gap-2 ${link}`}><Phone size={16} className="shrink-0" aria-hidden />{CONTACT.person.phone}</a></li>
              <li className="flex items-center gap-2 text-white/90"><Clock size={16} className="shrink-0" aria-hidden />{t(CONTACT.hours)}</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="grid size-10 place-items-center rounded-lg border border-white/30 hover:bg-white/10"><Linkedin /></a>
              <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid size-10 place-items-center rounded-lg border border-white/30 hover:bg-white/10"><Instagram /></a>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/20 pt-6 text-sm text-white/80 md:flex-row md:justify-between">
          <p>© 2026 Anargya Corp.</p>
          <p>{t("Prices in USD. Payments processed by Midtrans.")}</p>
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
        <span className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em]"><BrandMark />ANARGYA</span>
        <span className="text-xs text-white/90">© 2026 Anargya Corp.</span>
      </div>
    </footer>
  );
}
