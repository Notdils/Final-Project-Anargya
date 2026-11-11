"use client";
import { Download } from "lucide-react";
import { useT } from "@/i18n/client";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" className="btn btn-outline btn-lg" onClick={() => window.print()}>
      <Download size={16} aria-hidden /> {t("Download PDF")}
    </button>
  );
}
