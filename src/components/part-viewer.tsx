"use client";
import Image from "next/image";
import { Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useT } from "@/i18n/client";

// Framed viewer in the stage style. Until per-part 3D renders exist (modelUrl), the canvas area is a
// labeled placeholder and the controls are disabled, so nothing pretends to work.
export function PartViewer({ name, code, modelUrl, image }: { name: string; code: string; modelUrl: string | null; image?: string | null }) {
  const t = useT();
  const disabled = !modelUrl;
  const ctl = "btn btn-outline-dark px-2";
  return (
    <figure className="relative h-[360px] rounded-xl bg-stage text-white md:h-[480px] xl:h-[560px]" aria-label={t("{name}, 3D view", { name })}>
      <figcaption className="eyebrow absolute inset-x-0 top-5 text-center text-neutral-400">{name}</figcaption>
      <div className="absolute inset-x-8 bottom-16 top-12 md:inset-x-14 md:bottom-20 md:top-14">
        <span aria-hidden className="pointer-events-none absolute -inset-3">
          {["left-0 top-0 border-l-[1.5px] border-t-[1.5px]", "right-0 top-0 border-r-[1.5px] border-t-[1.5px]", "bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]", "bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]"].map((c) => (
            <span key={c} className={`absolute h-4 w-4 border-teal ${c}`} />
          ))}
        </span>
        {image && !modelUrl ? (
          <div className="relative h-full overflow-hidden rounded-lg bg-white">
            <Image src={image} alt={t("Preliminary 3D draft of the {name}", { name })} fill priority sizes="(min-width: 1280px) 720px, 100vw" className="object-contain p-4" />
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-lg border border-dashed border-stage-line font-mono text-xs uppercase tracking-wider text-neutral-400">
            {t(modelUrl ? "Loading model" : "Part 3D model (render in progress)")}
          </div>
        )}
      </div>
      <span className="eyebrow absolute bottom-6 left-5 text-neutral-400">{code}</span>
      {image && !modelUrl ? (
        <span className="eyebrow absolute bottom-6 right-5 text-neutral-400">{t("Preliminary 3D draft")}</span>
      ) : (
      <>
      <span className="eyebrow absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-neutral-400 md:block">{t("Drag to rotate")}</span>
      <div className="absolute bottom-4 right-4 flex gap-1">
        <button type="button" className={ctl} disabled={disabled} aria-label={t("Zoom out")}><ZoomOut size={16} aria-hidden /></button>
        <button type="button" className={ctl} disabled={disabled} aria-label={t("Zoom in")}><ZoomIn size={16} aria-hidden /></button>
        <button type="button" className={ctl} disabled={disabled} aria-label={t("Reset view")}><RotateCcw size={16} aria-hidden /></button>
        <button type="button" className={ctl} disabled={disabled} aria-label={t("Fullscreen")}><Maximize size={16} aria-hidden /></button>
      </div>
      </>
      )}
    </figure>
  );
}
