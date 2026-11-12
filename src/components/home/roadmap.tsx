"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";

// Five-year plan as a vertical timeline, one year per screen (Figma: "V3 · Home / Five-year plan
// (vertical, one year per screen)"). Normal scroll, no pinning: a teal line fills down to the middle
// of the viewport; when it reaches a dot, that year becomes active, its dot grows from 24 to 96 px
// and its text comes to full strength.
const STEPS = [
  ["Establishment", "Research and development of four EV modules (VCU/BMS, aero, uprights, pedal box), validated through field testing."],
  ["Market entry", "Component packages launch in Japan, with demos for Formula Student teams and our consulting service."],
  ["Expansion", "More teams as customers, full engineering consulting, and preparation for a complete car."],
  ["Diversification", "A complete formula car prototype, built with a manufacturing partner."],
  ["Consolidation", "Small-series formula car production and a base of returning customers."],
] as const;

export function Roadmap() {
  const t = useT();
  // -1 until the teal line reaches the first dot.
  const [active, setActive] = useState(-1);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // The teal fill follows the middle of the viewport. Each year's line is two halves (above and
    // below its dot); their fill is written as CSS variables so scrolling never re-renders React.
    // A dot counts as reached once the middle of the viewport passes its centre; the last reached
    // dot is the active year.
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = innerHeight / 2;
      let reached = -1;
      items.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const half = r.height / 2;
        const dot = r.top + half;
        el.style.setProperty("--above", String(Math.min(1, Math.max(0, (mid - r.top) / half))));
        el.style.setProperty("--below", String(Math.min(1, Math.max(0, (mid - dot) / half))));
        if (mid >= dot) reached = i;
      });
      setActive(reached);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", queue);
      removeEventListener("resize", queue);
    };
  }, []);

  return (
    <ol className="container-x">
      {STEPS.map(([stage, desc], i) => {
        const state = i < active ? "done" : i === active ? "active" : "upcoming";
        const on = state === "active";
        return (
          <li
            key={stage}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-i={i}
            aria-current={on ? "step" : undefined}
            className="grid min-h-svh grid-cols-[64px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[minmax(0,5fr)_96px_minmax(0,7fr)] md:gap-8"
          >
            {/* timeline column: grey line with a teal fill that tracks the middle of the viewport,
                above and below the dot. Year 1 and Year 5 keep their outer halves as lead-in and lead-out. */}
            <div className="relative flex h-full items-center justify-center self-stretch md:col-start-2" aria-hidden>
              <span className="absolute left-1/2 top-0 h-1/2 w-0.5 -translate-x-1/2 bg-neutral-200">
                <span className="absolute inset-0 origin-top scale-y-[var(--above,0)] bg-teal" />
              </span>
              <span className="absolute bottom-0 left-1/2 h-1/2 w-0.5 -translate-x-1/2 bg-neutral-200">
                <span className="absolute inset-0 origin-top scale-y-[var(--below,0)] bg-teal" />
              </span>
              <span
                className={`roadmap-dot relative grid place-items-center rounded-full font-mono text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                  on ? "size-12 bg-teal text-sm md:size-24 md:text-xl" : state === "done" ? "size-6 bg-teal text-[0px]" : "size-6 border-2 border-black bg-white text-[0px]"
                }`}
                data-active={on || undefined}
              >
                0{i + 1}
              </span>
            </div>

            <div
              className={`flex flex-col gap-4 py-16 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none md:col-start-3 ${on ? "opacity-100" : "translate-y-3 opacity-25"}`}
            >
              <div className="flex flex-col gap-1">
                <p className="eyebrow text-teal">{t(stage)}</p>
                <h3 className="text-[56px] font-semibold leading-[60px] tracking-[-0.03em] md:text-[96px] md:leading-[100px]">{t(`Year ${i + 1}`)}</h3>
              </div>
              <p className="max-w-[520px] text-lg leading-7 text-muted md:text-xl md:leading-8">{t(desc)}</p>
              <p className="font-mono text-sm tracking-wider" aria-hidden>
                0{i + 1} / 05
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
