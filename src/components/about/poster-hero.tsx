"use client";
/* eslint-disable @next/next/no-img-element -- decorative layers on one shared canvas; plain <img> keeps decode() and exact stacking */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useT } from "@/i18n/client";
import { POSTER_ID } from "./poster-boot";

// About hero built from the launch poster layers (public/about/poster, all on the same
// 1080 × 1350 canvas, so they stack without per-layer positioning; the sakura branch is cropped
// and hung from the section corner). The stage shows the canvas down to y = 1190; the poster's own text and footer layers are not used (they name the
// university), the copy below is real HTML text instead.
// The poster's A logo is not repeated here; it lives in the header (BrandMark).
// Motion, once on load: ANARGYA rises from behind its baseline, the car shrinks from large into
// its place, then the sakura and copy settle in. CSS lives in globals.css (.poster-*).
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** "We **design** it" -> alternating plain / teal spans. */
function Highlight({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <span key={i} className="text-teal">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function PosterHero() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);

  // Client-side navigation: hide the layers before first paint (a hard load does this earlier,
  // from the inline boot script in the About view).
  useIso(() => {
    const el = ref.current;
    if (el && el.dataset.anim === "idle" && !matchMedia("(prefers-reduced-motion: reduce)").matches) el.dataset.anim = "pre";
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.anim !== "pre") return;
    // Start once the two moving layers are decoded, so the motion never plays on empty boxes.
    const imgs = [...el.querySelectorAll<HTMLImageElement>("img[data-key]")];
    let done = false;
    const play = () => {
      if (done) return;
      done = true;
      el.dataset.anim = "play";
    };
    Promise.all(imgs.map((i) => i.decode().catch(() => undefined))).then(play);
    const id = setTimeout(play, 2500);
    return () => clearTimeout(id);
  }, []);

  const layer = "pointer-events-none absolute inset-x-0 top-0 h-auto w-full select-none";
  return (
    <section
      ref={ref}
      id={POSTER_ID}
      data-anim="idle"
      aria-labelledby="about-title"
      className="poster relative overflow-hidden bg-[#ececea] bg-[url(/about/poster/paper.webp)] bg-cover bg-center pt-16"
    >
      {/* sakura branch hangs from the section's top-left corner, not from the artwork column */}
      <img
        src="/about/poster/branch.webp"
        alt=""
        aria-hidden
        width={567}
        height={320}
        className="poster-branch pointer-events-none absolute left-0 top-16 w-[min(48vw,420px)] select-none"
      />
      <div className="container-x grid items-center gap-6 pb-12 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-10 md:pb-16 xl:gap-16">
        {/* artwork stage: 1080 × 1190 window onto the 1080 × 1350 canvas */}
        <div className="poster-stage relative mx-auto aspect-[1080/1190] w-full max-w-[640px]" aria-hidden>
          {/* wordmark: its box clips it at the baseline so it can rise from below */}
          <div className="absolute inset-x-0 top-0 aspect-[1080/1350] [clip-path:inset(25.7%_0_45.9%_0)]">
            <img data-key src="/about/poster/wordmark.webp" alt="" width={1080} height={1350} className={`poster-word ${layer}`} />
          </div>
          <img data-key src="/about/poster/car.webp" alt="" width={1080} height={1350} className={`poster-car ${layer} [mask-image:linear-gradient(to_right,transparent,black_12%)]`} />
          <img src="/about/poster/petals.webp" alt="" width={1080} height={1350} className={`poster-petals ${layer}`} />
        </div>

        <div className="poster-copy flex flex-col gap-4 [word-break:auto-phrase] md:gap-6">
          <p className="eyebrow text-black">{t("Engineering your next advantage")}</p>
          <h1 id="about-title" className="text-[32px] font-semibold leading-10 tracking-[-0.02em] md:text-[40px] md:leading-[48px] xl:text-[52px] xl:leading-[60px]">
            <Highlight text={t("We **design, analyze,** and **manufacture** your formula car to its best.")} />
          </h1>
          <div className="flex flex-col gap-4 text-[#404040]">
            <p>{t("Many formula teams, experienced or new, run into the same problems: component reliability, technical inspection, inconsistent vendor quality and rising material costs.")}</p>
            <p>{t("We work as an engineering partner for technical consulting, component development and custom parts, with high-standard materials and precision manufacturing. Your team puts supply concerns behind it and focuses on what matters: peak performance on the track.")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
