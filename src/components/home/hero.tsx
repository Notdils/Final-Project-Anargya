"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Maximize2, Pause, Play, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useLp, useT } from "@/i18n/client";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <span className="eyebrow text-neutral-400">E21</span>
    </div>
  ),
});

// Strongest results of the engineering team behind Anargya, at FSAE Japan.
const AWARDS = [
  { rank: "Winner", title: "PR Awards", year: "2025" },
  { rank: "1st", title: "Southeast Asian Team Ranking", year: "2024" },
  { rank: "2nd", title: "EV Class Ranking, Overseas Teams", year: "2024" },
] as const;

function SceneFallback() {
  const t = useT();
  return (
    <div className="grid h-full place-items-center">
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
  componentDidCatch() {
    done();
  }
  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children;
  }
}

// Same event the scene uses (kept here so the fallback path does not pull in three.js).
function done() {
  (window as unknown as { __anargyaProgress?: number }).__anargyaProgress = 100;
  window.dispatchEvent(new CustomEvent("anargya:progress", { detail: 100 }));
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Hero() {
  const t = useT();
  const L = useLp();
  const [rotating, setRotating] = useState(true);
  const [gl, setGl] = useState<boolean | null>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Immersive 3D: "off" -> "opening" (stage pinned over the hero) -> "on" (full screen) -> "closing" -> "off".
  const [mode, setMode] = useState<"off" | "opening" | "on" | "closing">("off");
  const [heroTop, setHeroTop] = useState(0);
  const [hinted, setHinted] = useState(false);
  const immersive = mode !== "off";
  const full = mode === "on";
  // Stop rendering the 3D scene once the hero scrolls out of view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const ZMIN = 0.75, STEP = 0.25;
  const ZMAX = full ? 4 : 2.25;
  const clampZoom = (z: number) => Math.min(ZMAX, Math.max(ZMIN, Math.round(z * 100) / 100));
  const zoomBy = (d: number) => setZoom((z) => clampZoom(z + d));
  const [cue, setCue] = useState(true);

  useEffect(() => {
    const ok = hasWebGL();
    setGl(ok);
    if (!ok) done(); // nothing to load: release the preloader at once
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRotating(false);
    try {
      setHinted(sessionStorage.getItem("anargya-3d-hinted") === "1");
    } catch {}
    const on = () => scrollY > 40 && setCue(false);
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  const open = () => {
    if (immersive) return;
    setHeroTop(sectionRef.current?.getBoundingClientRect().top ?? 0);
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
      }, reduce ? 0 : 560);
    const onPop = () => setMode("closing");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      // Keep keyboard focus inside the immersive view.
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
  }, [mode, immersive]);

  // The opener only exists again after the "off" render, so focus it from an effect.
  const returnFocus = useRef(false);
  useEffect(() => {
    if (mode !== "off" || !returnFocus.current) return;
    returnFocus.current = false;
    openerRef.current?.focus({ preventScroll: true });
  }, [mode]);

  // Wheel and pinch zoom, only in full-screen mode so the page keeps its normal scroll.
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
    <section ref={sectionRef} aria-labelledby="hero-title" className="relative h-svh min-h-[640px] overflow-hidden bg-stage text-white short:min-h-0">
      {/* The stage: pinned over the hero normally; in immersive mode it becomes a full-screen dialog
          that slides from the hero's position to the top while its black backdrop covers the page. */}
      <div
        ref={stageRef}
        role={immersive ? "dialog" : undefined}
        aria-modal={immersive || undefined}
        aria-label={immersive ? t("E21 in 3D") : undefined}
        style={immersive ? { top: full ? 0 : heroTop } : undefined}
        className={
          immersive
            ? `fixed inset-x-0 z-[1200] h-svh transition-[top,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${full ? "bg-stage" : "bg-stage/0"}`
            : "absolute inset-0"
        }
      >
        <div
          className={`absolute inset-x-0 transition-[top,bottom] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            full ? "bottom-0 top-0" : "bottom-[296px] top-16 [mask-image:linear-gradient(to_bottom,black_82%,transparent)] md:bottom-[240px] xl:bottom-[200px] short:bottom-0 short:left-[46%] short:right-14 short:[mask-image:none]"
          }`}
          aria-label={t(full ? "E21 3D model. Drag to rotate, scroll or pinch to zoom." : "E21 3D model. Drag to rotate.")}
          role="img"
        >
          {gl === false ? (
            <SceneFallback />
          ) : gl ? (
            <SceneBoundary>
              <HeroScene rotating={rotating} zoom={zoom} active={inView || immersive} immersive={full} />
            </SceneBoundary>
          ) : null}
        </div>

        {gl && (
          <div role="group" aria-label={t("3D view controls")} className={`absolute right-5 flex flex-col gap-2 md:right-8 xl:right-16 ${immersive ? "top-5 md:top-8" : "top-20"}`}>
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
            <button
              type="button"
              onClick={() => setRotating((r) => !r)}
              aria-pressed={!rotating}
              aria-label={t(rotating ? "Pause rotation" : "Resume rotation")}
              className="btn btn-outline-dark px-2"
            >
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

      <div className="container-x pointer-events-none absolute inset-x-0 bottom-0 pb-14 md:pb-16 short:pb-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between short:max-w-[44%] short:flex-col short:items-start short:gap-4">
          <div className="pointer-events-auto flex flex-col gap-4 md:gap-6 short:gap-3">
            <p className="eyebrow text-neutral-400">{t("Nagoya, Japan · Formula EV design")}</p>
            <h1 id="hero-title" className="whitespace-nowrap text-[30px] font-semibold leading-9 tracking-[-0.03em] min-[400px]:text-[34px] md:text-5xl md:leading-[52px] xl:text-[64px] xl:leading-[68px] short:text-[30px] short:leading-9">
              {t("Parts & Consultation")}
            </h1>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={L("/marketplace")} className="btn btn-teal">{t("Explore marketplace")}</Link>
              <Link href={L("/about")} className="btn btn-outline-dark">{t("Our story")}</Link>
            </div>
          </div>
          <section aria-labelledby="awards-title" className="pointer-events-auto flex flex-col gap-3 short:gap-2">
            <h2 id="awards-title" className="eyebrow text-neutral-400">{t("FSAE Japan results")}</h2>
            <ul className="grid grid-cols-3 gap-4 md:flex md:gap-8 short:grid short:gap-4">
              {AWARDS.map((a) => (
                <li key={a.title} className="flex max-w-[176px] flex-col gap-1 border-l border-teal pl-3">
                  <span className="whitespace-nowrap text-lg font-semibold leading-6 md:text-2xl md:leading-8 short:text-lg short:leading-6">{t(a.rank)}</span>
                  <span className="text-xs leading-4 text-neutral-300 [word-break:keep-all] md:text-sm md:leading-5 short:text-xs short:leading-4">{t(a.title)}</span>
                  <span className="font-mono text-xs text-neutral-400">{a.year}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div
        aria-hidden
        className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 md:hidden xl:flex short:hidden flex-col items-center gap-1 text-neutral-400 transition-opacity duration-300 md:bottom-6 ${cue ? "opacity-100" : "opacity-0"}`}
      >
        <span className="eyebrow hidden md:block">{t("Scroll")}</span>
        <ChevronDown size={20} className="scroll-cue" />
      </div>
    </section>
  );
}
