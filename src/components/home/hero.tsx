"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Pause, Play } from "lucide-react";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <span className="eyebrow text-neutral-600">Loading E21</span>
    </div>
  ),
});

const SPECS = [
  ["Model", "E21"],
  ["Powertrain", "[PLACEHOLDER]"],
  ["Mass", "[PLACEHOLDER]"],
] as const;

function SceneFallback() {
  return (
    <div className="grid h-full place-items-center">
      <span className="eyebrow text-neutral-600">3D preview unavailable on this device</span>
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
  const [rotating, setRotating] = useState(true);
  const [gl, setGl] = useState<boolean | null>(null);
  const [cue, setCue] = useState(true);

  useEffect(() => {
    setGl(hasWebGL());
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRotating(false);
    const on = () => scrollY > 40 && setCue(false);
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  return (
    <section aria-labelledby="hero-title" className="relative h-svh min-h-[640px] overflow-hidden bg-stage text-white">
      <div className="absolute inset-x-0 bottom-[296px] top-16 md:bottom-[240px] xl:bottom-[200px]" aria-label="E21 3D model. Drag to rotate." role="img">
        {gl === false ? (
          <SceneFallback />
        ) : gl ? (
          <SceneBoundary>
            <HeroScene rotating={rotating} />
          </SceneBoundary>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setRotating((r) => !r)}
        aria-pressed={!rotating}
        aria-label={rotating ? "Pause rotation" : "Resume rotation"}
        className="btn btn-outline-dark absolute right-5 top-20 px-2 md:right-8 xl:right-16"
      >
        {rotating ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
      </button>

      <div className="container-x pointer-events-none absolute inset-x-0 bottom-0 pb-14 md:pb-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="pointer-events-auto flex flex-col gap-4 md:gap-6">
            <p className="eyebrow text-neutral-400">[CITY], Japan · Formula EV design</p>
            <h1 id="hero-title" className="text-[40px] font-semibold leading-[44px] tracking-[-0.03em] md:text-[56px] md:leading-[56px] xl:text-[72px] xl:leading-[72px]">
              Formula EV,
              <br />
              designed to race.
            </h1>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/marketplace" className="btn btn-ochre">Explore marketplace</Link>
              <Link href="/about" className="btn btn-outline-dark">Our story</Link>
            </div>
          </div>
          <dl className="pointer-events-auto hidden gap-8 md:flex">
            {SPECS.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <dt className="eyebrow text-neutral-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div
        aria-hidden
        className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-neutral-400 transition-opacity duration-300 md:bottom-6 ${cue ? "opacity-100" : "opacity-0"}`}
      >
        <span className="eyebrow hidden md:block">Scroll</span>
        <ChevronDown size={20} className="scroll-cue" />
      </div>
    </section>
  );
}
