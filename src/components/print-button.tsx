"use client";
import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-outline btn-lg" onClick={() => window.print()}>
      <Download size={16} aria-hidden /> Download PDF
    </button>
  );
}
