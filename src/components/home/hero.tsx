"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pause, Play } from "lucide-react";
import { useLp, useT } from "@/i18n/client";

// Strongest results of the engineering team behind Anargya, at FSAE Japan.
const AWARDS = [
  { rank: "Winner", title: "PR Awards", year: "2025" },
  { rank: "1st", title: "Southeast Asian Team Ranking", year: "2024" },
  { rank: "2nd", title: "EV Class Ranking, Overseas Teams", year: "2024" },
] as const;

// Releases the splash preloader (components/home/preloader.tsx listens for this).
function done() {
  (window as unknown as { __anargyaProgress?: number }).__anargyaProgress = 100;
  window.dispatchEvent(new CustomEvent("anargya:progress", { detail: 100 }));
}

/** Team footage as the hero background, dimmed so the text stays readable. Muted and looped; the
 *  Pause button stops it. Not loaded at all for reduced motion (the hero stays black). Phones in
 *  portrait get a smaller centre crop. The 3D car lives on About (Our story). */
function HeroVideo({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return done();
    setSrc(matchMedia("(max-width: 767px) and (orientation: portrait)").matches ? "/home/video/hero-540.mp4" : "/home/video/hero-1280.mp4");
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing, src]);
  if (!src) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <video ref={ref} src={src} poster="/home/video/hero-poster.webp" muted loop playsInline autoPlay preload="auto" disablePictureInPicture
        onCanPlay={done} onError={done} className="size-full object-cover" />
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}

export function Hero() {
  const t = useT();
  const L = useLp();
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(true);
  const [motion, setMotion] = useState(false);
  const [cue, setCue] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  // Pause the video once the hero scrolls out of view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setMotion(!matchMedia("(prefers-reduced-motion: reduce)").matches);
    const on = () => scrollY > 40 && setCue(false);
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="relative h-svh min-h-[640px] overflow-hidden bg-stage text-white short:min-h-0">
      <HeroVideo playing={playing && inView} />

      {motion && (
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing} aria-label={t(playing ? "Pause video" : "Play video")}
          className="btn btn-outline-dark absolute right-5 top-20 px-2 md:right-8 xl:right-16">
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>
      )}

      <div className="container-x pointer-events-none absolute inset-x-0 bottom-0 pb-14 md:pb-16 short:pb-6">
        {/* side by side only from 1280px: at tablet widths the title and the three results do not fit in one row */}
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
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
