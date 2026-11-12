"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Page loader: a thin teal bar at the top while the next page loads.
 * Starts on a click on an internal link (or the browser back/forward), creeps towards 85%,
 * and completes when the URL changes. No bar for same-page links, new tabs, downloads,
 * or clicks the checkout leave-confirm dialog intercepted.
 */
export function RouteProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [p, setP] = useState<number | null>(null); // null = hidden
  const timers = useRef<number[]>([]);
  const shownUrl = useRef(""); // URL of the page currently on screen
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const start = () => {
    clear();
    setP(8);
    // creep: fast at first, slower near the end, never reaching 100 on its own
    let v = 8;
    const tick = () => {
      v = v + (85 - v) * 0.12;
      setP(v);
      timers.current.push(window.setTimeout(tick, 200));
    };
    timers.current.push(window.setTimeout(tick, 120));
    timers.current.push(window.setTimeout(done, 10000)); // safety: never stay stuck
  };
  const done = () => {
    clear();
    setP((cur) => (cur === null ? null : 100));
    timers.current.push(window.setTimeout(() => setP(null), 250));
  };

  // the URL changed: the new page is on screen
  useEffect(() => { shownUrl.current = path + (search?.size ? `?${search}` : ""); done(); }, [path, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page or #hash
      // decide after the click finished dispatching: the leave-confirm dialog may have cancelled it
      window.setTimeout(() => { if (!(e as MouseEvent & { leaveGuarded?: boolean }).leaveGuarded) start(); }, 0);
    };
    // back/forward: start only if the URL really moved (the checkout leave-confirm puts it back)
    const onPop = () => window.setTimeout(() => { if (location.pathname + location.search !== shownUrl.current) start(); }, 0);
    window.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("click", onClick, true); window.removeEventListener("popstate", onPop); clear(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (p === null) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[2000] h-0.5">
      <div className="h-full bg-teal shadow-[0_0_8px_rgba(0,111,102,0.6)] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${p}%`, opacity: p >= 100 ? 0 : 1 }} />
    </div>
  );
}
