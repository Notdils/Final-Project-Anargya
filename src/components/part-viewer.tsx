"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useT } from "@/i18n/client";

const PartScene = dynamic(() => import("./part-scene"), { ssr: false });

const ZMIN = 0.6, ZMAX = 2.6, STEP = 0.4;

function Brackets() {
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-3">
      {["left-0 top-0 border-l-[1.5px] border-t-[1.5px]", "right-0 top-0 border-r-[1.5px] border-t-[1.5px]", "bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]", "bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]"].map((c) => (
        <span key={c} className={`absolute h-4 w-4 border-teal ${c}`} />
      ))}
    </span>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Framed part viewer in the stage style: live 3D when the part has a model, otherwise the render image. */
export function PartViewer({ name, code, modelUrl, image }: { name: string; code: string; modelUrl: string | null; image?: string | null }) {
  const t = useT();
  const fig = useRef<HTMLElement>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const [rotating, setRotating] = useState(true);
  const [full, setFull] = useState(false);

  useEffect(() => {
    setGl(hasWebGL());
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRotating(false);
    const on = () => setFull(document.fullscreenElement === fig.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const live = Boolean(modelUrl) && gl !== false;
  const zoomBy = (d: number) => setZoom((z) => Math.min(ZMAX, Math.max(ZMIN, Math.round((z + d) * 100) / 100)));
  const reset = () => { setZoom(1); setResetKey((k) => k + 1); };
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : fig.current?.requestFullscreen?.())?.catch(() => {});
  const ctl = "btn btn-outline-dark px-2";

  return (
    <figure ref={fig} className="relative h-[360px] rounded-xl bg-stage text-white md:h-[480px] xl:h-[560px] [&:fullscreen]:h-screen [&:fullscreen]:rounded-none" aria-label={t("{name}, 3D view", { name })}>
      <figcaption className="eyebrow absolute inset-x-0 top-5 z-10 text-center text-neutral-400">{name}</figcaption>
      <div className="absolute inset-x-8 bottom-16 top-12 md:inset-x-14 md:bottom-20 md:top-14">
        <Brackets />
        {live ? (
          <>
            {/* render image stays as a poster until the model has loaded */}
            {!ready && image && (
              <div className="absolute inset-0 overflow-hidden rounded-lg bg-white opacity-40">
                <Image src={image} alt="" fill priority sizes="(min-width: 1280px) 720px, 100vw" className="object-contain p-4" />
              </div>
            )}
            {!ready && <span className="eyebrow absolute inset-0 grid place-items-center text-neutral-300">{t("Loading model")}</span>}
            <div className="absolute inset-0 cursor-grab rounded-lg bg-[radial-gradient(ellipse_at_50%_45%,#2a2a2a_0%,#141414_55%,#000_100%)] active:cursor-grabbing" role="img" aria-label={t("Preliminary 3D draft of the {name}", { name })}>
              <PartScene url={modelUrl!} zoom={zoom} resetKey={resetKey} rotating={rotating} onReady={() => setReady(true)} />
            </div>
          </>
        ) : image ? (
          <div className="relative h-full overflow-hidden rounded-lg bg-white">
            <Image src={image} alt={t("Preliminary 3D draft of the {name}", { name })} fill priority sizes="(min-width: 1280px) 720px, 100vw" className="object-contain p-4" />
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-lg border border-dashed border-stage-line font-mono text-xs uppercase tracking-wider text-neutral-400">
            {t("Part 3D model (render in progress)")}
          </div>
        )}
      </div>
      <span className="eyebrow absolute bottom-6 left-5 text-neutral-400">{code}</span>
      {live ? (
        <>
          <span className="eyebrow absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-neutral-400 md:block">{t("Drag to rotate")}</span>
          <div className="absolute bottom-4 right-4 flex gap-1">
            <button type="button" className={ctl} onClick={() => setRotating((r) => !r)} aria-label={t(rotating ? "Pause rotation" : "Resume rotation")}>
              {rotating ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            </button>
            <button type="button" className={ctl} disabled={zoom <= ZMIN} onClick={() => zoomBy(-STEP)} aria-label={t("Zoom out")}><ZoomOut size={16} aria-hidden /></button>
            <button type="button" className={ctl} disabled={zoom >= ZMAX} onClick={() => zoomBy(STEP)} aria-label={t("Zoom in")}><ZoomIn size={16} aria-hidden /></button>
            <button type="button" className={ctl} onClick={reset} aria-label={t("Reset view")}><RotateCcw size={16} aria-hidden /></button>
            <button type="button" className={ctl} onClick={toggleFull} aria-label={t(full ? "Exit fullscreen" : "Fullscreen")}>
              {full ? <Minimize size={16} aria-hidden /> : <Maximize size={16} aria-hidden />}
            </button>
          </div>
        </>
      ) : image ? (
        <span className="eyebrow absolute bottom-6 right-5 text-neutral-400">{t("Preliminary 3D draft")}</span>
      ) : null}
    </figure>
  );
}
