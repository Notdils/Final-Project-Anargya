"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";

export function RemoveAddress() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className="w-fit text-sm font-medium text-oxide hover:underline disabled:opacity-50"
      onClick={async () => { setBusy(true); await fetch("/api/account/address", { method: "DELETE" }).catch(() => null); setBusy(false); router.refresh(); }}>
      {t("Remove saved address")}
    </button>
  );
}
