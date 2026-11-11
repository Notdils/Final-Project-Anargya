"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
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

export function Hero() {
  const t = useT();
  const L = useLp();
  const [rotating, setRotating] = useState(true);
  const [gl, setGl] = useState<boolean | null>(null);
  const [zoom, setZoom] = useState(1);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  // Stop rendering the 3D scene once the hero scrolls out of view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const ZMIN = 0.75, ZMAX = 2.25, STEP = 0.25;
  const zoomBy = (d: number) => setZoom((z) => Math.min(ZMAX, Math.max(ZMIN, Math.round((z + d) * 100) / 100)));
  const [cue, setCue] = useState(true);

  useEffect(() => {
    setGl(hasWebGL());
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRotating(false);
    const on = () => scrollY > 40 && setCue(false);
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="relative h-svh min-h-[640px] overflow-hidden bg-stage text-white">
      <div className="absolute inset-x-0 bottom-[296px] top-16 [mask-image:linear-gradient(to_bottom,black_82%,transparent)] md:bottom-[240px] xl:bottom-[200px]" aria-label={t("E21 3D model. Drag to rotate.")} role="img">
        {gl === false ? (
          <SceneFallback />
        ) : gl ? (
          <SceneBoundary>
            <HeroScene rotating={rotating} zoom={zoom} active={inView} />
          </SceneBoundary>
        ) : null}
      </div>

      {gl && (
        <div role="group" aria-label={t("3D view controls")} className="absolute right-5 top-20 flex flex-col gap-2 md:right-8 xl:right-16">
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

      <div className="container-x pointer-events-none absolute inset-x-0 bottom-0 pb-14 md:pb-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="pointer-events-auto flex flex-col gap-4 md:gap-6">
            <p className="eyebrow text-neutral-400">{t("[CITY], Japan · Formula EV design")}</p>
            <h1 id="hero-title" className="text-[40px] font-semibold leading-[44px] tracking-[-0.03em] md:text-[56px] md:leading-[56px] xl:text-[72px] xl:leading-[72px]">
              {t("Formula EV,")}
              <br />
              {t("designed to race.")}
            </h1>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={L("/marketplace")} className="btn btn-teal">{t("Explore marketplace")}</Link>
              <Link href={L("/about")} className="btn btn-outline-dark">{t("Our story")}</Link>
            </div>
          </div>
          <section aria-labelledby="awards-title" className="pointer-events-auto flex flex-col gap-3">
            <h2 id="awards-title" className="eyebrow text-neutral-400">{t("FSAE Japan results")}</h2>
            <ul className="grid grid-cols-3 gap-4 md:flex md:gap-8">
              {AWARDS.map((a) => (
                <li key={a.title} className="flex max-w-[176px] flex-col gap-1 border-l border-teal pl-3">
                  <span className="whitespace-nowrap text-lg font-semibold leading-6 md:text-2xl md:leading-8">{t(a.rank)}</span>
                  <span className="text-xs leading-4 text-neutral-300 [word-break:keep-all] md:text-sm md:leading-5">{t(a.title)}</span>
                  <span className="font-mono text-xs text-neutral-400">{a.year}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div
        aria-hidden
        className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 md:hidden xl:flex flex-col items-center gap-1 text-neutral-400 transition-opacity duration-300 md:bottom-6 ${cue ? "opacity-100" : "opacity-0"}`}
      >
        <span className="eyebrow hidden md:block">{t("Scroll")}</span>
        <ChevronDown size={20} className="scroll-cue" />
      </div>
    </section>
  );
}
