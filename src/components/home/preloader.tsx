"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useT } from "@/i18n/client";
import { INTRO_KEY } from "./preloader-boot";

// Splash preloader for Home: once per browser session, while the hero's 3D model downloads.
// 0 to 99% runs on a fixed clock with an ease-out curve (fast start, slow finish), the same on
// every device. The last step to 100% waits for the real signal from hero-scene.tsx
// ("anargya:progress" = 100, the car is in the scene), so the splash never lifts onto an empty hero.
const DURATION_MS = 2400; // time for 0 to 99%
const MAX_MS = 8000; // slow network or a stuck GLB: never hold the page hostage
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

function seen() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

export function Preloader() {
  const t = useT();
  const [state, setState] = useState<"show" | "leaving" | "gone">("show");
  const [shown, setShown] = useState(0);
  const real = useRef(0);

  // Before paint: repeat visits (and client-side returns to Home) skip the splash entirely.
  useIso(() => {
    if (seen()) setState("gone");
  }, []);

  useEffect(() => {
    if (state !== "show") return;
    const start = performance.now();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    real.current = (window as unknown as { __anargyaProgress?: number }).__anargyaProgress ?? 0;
    const onProgress = (e: Event) => (real.current = (e as CustomEvent<number>).detail);
    addEventListener("anargya:progress", onProgress);
    document.documentElement.style.overflow = "hidden";

    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const ready = real.current >= 100 || elapsed > MAX_MS;
      // Time-based, so a slow GPU (few frames) still keeps the schedule.
      const value = elapsed >= DURATION_MS && ready ? 100 : Math.floor(99 * easeOutCubic(Math.min(elapsed / DURATION_MS, 1)));
      setShown(value);
      if (value === 100) {
        try {
          sessionStorage.setItem(INTRO_KEY, "1");
        } catch {}
        setState(reduce ? "gone" : "leaving");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("anargya:progress", onProgress);
      document.documentElement.style.overflow = "";
    };
  }, [state]);

  // transitionend can be skipped (background tab); this guarantees the overlay goes away.
  useEffect(() => {
    if (state !== "leaving") return;
    const id = setTimeout(() => setState("gone"), 700);
    return () => clearTimeout(id);
  }, [state]);

  if (state === "gone") return null;
  return (
    <div
      className="preloader"
      data-leaving={state === "leaving" || undefined}
      onTransitionEnd={() => setState("gone")}
      role="progressbar"
      aria-label={t("Loading")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={shown}
    >
      <div className="flex w-[min(320px,calc(100vw-48px))] flex-col items-center gap-6">
        <div className="flex items-center gap-3 text-white">
          <BrandMark className="h-8 w-[50px]" />
          <span className="text-xl font-semibold tracking-[0.24em]">ANARGYA</span>
        </div>
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full origin-left bg-teal" style={{ transform: `scaleX(${shown / 100})` }} />
        </div>
        <div className="flex w-full justify-between font-mono text-xs uppercase tracking-wider text-white/50">
          <span>{t("Nagoya, Japan · Formula EV design")}</span>
          <span className="tabular-nums text-white/80">{shown}%</span>
        </div>
      </div>
    </div>
  );
}
