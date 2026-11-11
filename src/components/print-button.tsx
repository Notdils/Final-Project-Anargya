"use client";
import { Download } from "lucide-react";
import { useT } from "@/i18n/client";

/** Opens the print dialog (Save as PDF). The page title becomes the file name, e.g. "Invoice AN-2026-0001". */
export function PrintButton({ filename }: { filename?: string }) {
  const t = useT();
  const print = () => {
    const prev = document.title;
    if (filename) document.title = filename;
    window.print();
    document.title = prev;
  };
  return (
    <button type="button" className="btn btn-outline btn-lg" onClick={print}>
      <Download size={16} aria-hidden /> {t("Download invoice")}
    </button>
  );
}
