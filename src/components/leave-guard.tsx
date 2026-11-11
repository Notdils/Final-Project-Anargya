"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";

/**
 * Asks before the user leaves a page with unsaved work: browser back button, links on the page,
 * and closing / reloading the tab (that one uses the browser's own prompt; browsers do not allow custom text).
 * Returns the dialog to render. Turn `enabled` off before navigating on purpose (e.g. after payment).
 */
export function useLeaveGuard(enabled: boolean) {
  const t = useT();
  const router = useRouter();
  const on = useRef(enabled);
  on.current = enabled;
  const [leave, setLeave] = useState<null | (() => void)>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const onUnload = (e: BeforeUnloadEvent) => { if (on.current) e.preventDefault(); };
    // Back button: keep one extra entry on top so "back" lands here first and we can ask.
    history.pushState({ leaveGuard: true }, "");
    const onPop = () => {
      if (!on.current) return;
      history.pushState({ leaveGuard: true }, "");
      setLeave(() => () => { on.current = false; history.go(-2); });
    };
    const onClick = (e: MouseEvent) => {
      if (!on.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      e.stopPropagation(); // capture phase: runs before Next's <Link> handler
      setLeave(() => () => { on.current = false; router.push(url.pathname + url.search + url.hash); });
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("popstate", onPop);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("click", onClick, true);
    };
  }, [enabled, router]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (leave && !d.open) d.showModal();
    if (!leave && d.open) d.close();
  }, [leave]);

  const dialog = (
    <dialog ref={ref} onClose={() => setLeave(null)} aria-labelledby="leave-title" className="m-auto w-[min(400px,calc(100vw-40px))] rounded-xl p-6 backdrop:bg-black/50">
      <h2 id="leave-title" className="text-lg font-semibold">{t("Leave checkout?")}</h2>
      <p className="mt-2 text-sm text-muted">{t("The details you typed will be lost. Your cart stays as it is.")}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-outline" onClick={() => { const go = leave; setLeave(null); go?.(); }}>{t("Leave")}</button>
        {/* autofocus on the safe choice */}
        <button type="button" className="btn btn-teal" autoFocus onClick={() => setLeave(null)}>{t("Stay on checkout")}</button>
      </div>
    </dialog>
  );
  return { dialog, disable: () => { on.current = false; } };
}
