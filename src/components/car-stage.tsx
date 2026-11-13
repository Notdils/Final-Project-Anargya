"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Pause, Play, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useT } from "@/i18n/client";

// The E21 in 3D (About → Our story): a dark card with rotate, zoom and a full-screen ("immersive") view.
const HeroScene = dynamic(() => import("@/components/home/hero-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <span className="eyebrow text-neutral-400">E21</span>
    </div>
  ),
});

function SceneFallback() {
  const t = useT();
  return (
    <div className="grid h-full place-items-center px-4 text-center">
      <span className="eyebrow text-neutral-400">{t("3D preview unavailable on this device")}</span>
    </div>
  );
}

// A device without WebGL (or a GPU crash) must not take the whole page down.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function CarStage({ className = "" }: { className?: string }) {
  const t = useT();
  const [rotating, setRotating] = useState(true);
  const [gl, setGl] = useState<boolean | null>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [inView, setInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Full screen: "off" -> "opening" (fixed, still transparent) -> "on" -> "closing" -> "off".
  const [mode, setMode] = useState<"off" | "opening" | "on" | "closing">("off");
  const [hinted, setHinted] = useState(false);
  const immersive = mode !== "off";
  const full = mode === "on";

  // Only render the 3D scene while the card is on screen.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ZMIN = 0.75, STEP = 0.25;
  const ZMAX = full ? 4 : 2.25;
  const clampZoom = (z: number) => Math.min(ZMAX, Math.max(ZMIN, Math.round(z * 100) / 100));
  const zoomBy = (d: number) => setZoom((z) => clampZoom(z + d));

  useEffect(() => {
    setGl(hasWebGL());
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRotating(false);
    try {
      setHinted(sessionStorage.getItem("anargya-3d-hinted") === "1");
    } catch {}
  }, []);

  const open = () => {
    if (immersive) return;
    setMode("opening");
    setHinted(true);
    try {
      sessionStorage.setItem("anargya-3d-hinted", "1");
    } catch {}
    history.pushState({ ...history.state, anargya3d: true }, "");
  };
  // Every exit path (button, Esc) goes through history so the phone's back button behaves the same.
  const close = () => (history.state?.anargya3d ? history.back() : setMode("closing"));

  useEffect(() => {
    if (!immersive) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    let id = 0;
    if (mode === "opening") id = requestAnimationFrame(() => requestAnimationFrame(() => setMode("on")));
    if (mode === "on") closeRef.current?.focus({ preventScroll: true });
    if (mode === "closing")
      id = window.setTimeout(() => {
        setMode("off");
        setZoom(1);
        returnFocus.current = true;
      }, reduce ? 0 : 400);
    const onPop = () => setMode("closing");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      // Keep keyboard focus inside the full-screen view.
      const items = stageRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      const wrap = e.shiftKey ? document.activeElement === first && last : document.activeElement === last && first;
      if (wrap) {
        e.preventDefault();
        wrap.focus();
      }
    };
    addEventListener("popstate", onPop);
    addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(id);
      removeEventListener("popstate", onPop);
      removeEventListener("keydown", onKey);
      root.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, immersive]);

  // The opener only exists again after the "off" render, so focus it from an effect.
  const returnFocus = useRef(false);
  useEffect(() => {
    if (mode !== "off" || !returnFocus.current) return;
    returnFocus.current = false;
    openerRef.current?.focus({ preventScroll: true });
  }, [mode]);

  // Wheel and pinch zoom, only in full screen so the page keeps its normal scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!full || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clampZoom(z * Math.exp(-e.deltaY * 0.0015)));
    };
    const pts = new Map<number, { x: number; y: number }>();
    let startDist = 0, startZoom = 1;
    const dist = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        startDist = dist();
        startZoom = zoomRef.current;
      }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && startDist > 0) setZoom(clampZoom(startZoom * (dist() / startDist)));
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) startDist = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", down, true);
    el.addEventListener("pointermove", move, true);
    el.addEventListener("pointerup", up, true);
    el.addEventListener("pointercancel", up, true);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointermove", move, true);
      el.removeEventListener("pointerup", up, true);
      el.removeEventListener("pointercancel", up, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  return (
    // The card keeps its size while the stage is lifted out to full screen.
    <div ref={cardRef} className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-stage text-white ${className}`}>
      <div
        ref={stageRef}
        role={immersive ? "dialog" : undefined}
        aria-modal={immersive || undefined}
        aria-label={immersive ? t("E21 in 3D") : undefined}
        className={
          immersive
            ? `fixed inset-0 z-[1200] bg-stage transition-opacity duration-300 motion-reduce:transition-none ${full ? "opacity-100" : "opacity-0"}`
            : "absolute inset-0"
        }
      >
        <div
          className="absolute inset-0"
          aria-label={t(full ? "E21 3D model. Drag to rotate, scroll or pinch to zoom." : "E21 3D model. Drag to rotate.")}
          role="img"
        >
          {gl === false ? (
            <SceneFallback />
          ) : gl && (inView || immersive) ? (
            <SceneBoundary>
              <HeroScene rotating={rotating} zoom={zoom} active immersive={full} />
            </SceneBoundary>
          ) : null}
        </div>

        {gl && (
          <div role="group" aria-label={t("3D view controls")} className={`absolute flex flex-col gap-2 ${immersive ? "right-5 top-5 md:right-8 md:top-8" : "right-3 top-3"}`}>
            {immersive ? (
              <button ref={closeRef} type="button" onClick={close} aria-label={t("Exit 3D view")} className="btn btn-outline-dark px-2">
                <X size={16} aria-hidden />
              </button>
            ) : (
              <div className="relative flex items-center">
                {!hinted && (
                  <span aria-hidden className="tap-hint pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-ink">
                    <span className="[@media(hover:hover)]:hidden">{t("Tap me")}</span>
                    <span className="hidden [@media(hover:hover)]:inline">{t("Click me")}</span>
                  </span>
                )}
                <button ref={openerRef} type="button" onClick={open} aria-label={t("Explore in 3D")} className="btn btn-outline-dark px-2">
                  <Maximize2 size={16} aria-hidden />
                </button>
              </div>
            )}
            <button type="button" onClick={() => setRotating((r) => !r)} aria-pressed={!rotating} aria-label={t(rotating ? "Pause rotation" : "Resume rotation")} className="btn btn-outline-dark px-2">
              {rotating ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            </button>
            <button type="button" onClick={() => zoomBy(STEP)} disabled={zoom >= ZMAX} aria-label={t("Zoom in")} className="btn btn-outline-dark px-2">
              <ZoomIn size={16} aria-hidden />
            </button>
            <button type="button" onClick={() => zoomBy(-STEP)} disabled={zoom <= ZMIN} aria-label={t("Zoom out")} className="btn btn-outline-dark px-2">
              <ZoomOut size={16} aria-hidden />
            </button>
            {zoom !== 1 && (
              <button type="button" onClick={() => setZoom(1)} aria-label={t("Reset zoom")} className="btn btn-outline-dark px-2">
                <RotateCcw size={16} aria-hidden />
              </button>
            )}
          </div>
        )}

        {full && (
          <p aria-hidden className="eyebrow pointer-events-none absolute inset-x-0 bottom-6 text-center text-neutral-400 md:bottom-8">
            <span className="[@media(hover:hover)]:hidden">{t("Drag to rotate · Pinch to zoom")}</span>
            <span className="hidden [@media(hover:hover)]:inline">{t("Drag to rotate · Scroll to zoom")}</span>
          </p>
        )}
      </div>
    </div>
  );
}
