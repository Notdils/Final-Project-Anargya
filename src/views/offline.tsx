import Link from "next/link";
import { lp, translator, type Locale } from "@/i18n";


export default function OfflineView({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const L = (p: string) => lp(p, locale);
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-stage px-5 text-white">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="eyebrow text-neutral-400">Anargya</p>
        <h1 className="text-[28px] font-semibold leading-9">{t("You are offline.")}</h1>
        <p className="text-neutral-400">{t("Pages you visited before are still available. Checkout and receipts need a connection.")}</p>
        <Link href={L("/")} className="btn btn-outline-dark">{t("Try again")}</Link>
      </div>
    </main>
  );
}
