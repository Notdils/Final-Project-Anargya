"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * While a payment is pending, re-render the page every few seconds (the server re-checks Midtrans on each render),
 * so a finished payment shows up without the buyer pressing refresh. Stops after ~3 minutes or when the tab is hidden.
 */
export function AutoRefresh({ everyMs = 4000, maxTries = 45 }: { everyMs?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      if (document.hidden) return;
      if (++n > maxTries) return clearInterval(id);
      router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, maxTries]);
  return null;
}
