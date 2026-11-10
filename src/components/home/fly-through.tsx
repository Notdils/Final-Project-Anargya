"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Z fly-through (skill: motion-parallax). Camera dollies along Z on scroll; objects are projected
// with perspective so they grow radially from the vanishing point. Two headlines swap mid-way.

type Obj = { name: string; x: number; y: number; z: number; size: number; tilt: number; mobile?: boolean };

// 3 waves; wave 3 is deep enough that 2 objects remain visible at p = 0.95 (z >= 0.95 * 3700 + 400).
const OBJECTS: Obj[] = [
  { name: "Wheel", x: -0.5, y: -0.45, z: 1700, size: 10, tilt: -12, mobile: true },
  { name: "Front wing", x: 0.55, y: 0.42, z: 1950, size: 13, tilt: 4, mobile: true },
  { name: "Damper", x: 0.45, y: -0.5, z: 2200, size: 7, tilt: 14 },
  { name: "Brake rotor", x: -0.62, y: 0.02, z: 2600, size: 8, tilt: -8, mobile: true },
  { name: "Steering wheel", x: -0.35, y: 0.55, z: 2850, size: 8, tilt: 10 },
  { name: "Motor housing", x: 0.6, y: -0.1, z: 3100, size: 9, tilt: -3, mobile: true },
  { name: "Radiator", x: -0.4, y: -0.5, z: 3450, size: 8, tilt: 6, mobile: true },
  { name: "Nose cone", x: 0.3, y: 0.5, z: 3950, size: 9, tilt: -15, mobile: true },
  { name: "Upright", x: 0.15, y: -0.55, z: 4100, size: 6, tilt: 9 },
];

// Anargya double-strand mark, drawn algorithmically (decorative line-art, not the logo file).
function markPath() {
  const A = 56, L = 196, cy = 80;
  const a: string[] = [], b: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = -1.4 + (2.8 * i) / 120;
    const tc = Math.max(-1, Math.min(1, t));
    const x = (200 + (t / 1.4) * L).toFixed(1);
    a.push(`${x} ${(cy - A * Math.cos(Math.PI * tc)).toFixed(1)}`);
    b.push(`${x} ${(cy + A * Math.cos(Math.PI * tc)).toFixed(1)}`);
  }
  return `M${a.join(" L")} M${b.join(" L")}`;
}
const MARK = markPath();

const CFG = { focal: 1000, travel: 3700, fogFar: 3200, fogNear: 2600, nearFade: 400, nearClip: 260, scrub: 0.6, staticP: 0.65, mouse: 0.08, mouseEase: 0.15 };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const LINE_A = ["Designing", "cars?"];
const LINE_B = ["We", "got", "you", "covered."];

export function FlyThrough() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stage = section.querySelector<HTMLElement>(".mp__stage")!;
    const items = [...section.querySelectorAll<HTMLElement>(".mp__obj, .mp__plane")].map((el) => ({
      el,
      x: +el.dataset.x!, y: +el.dataset.y!, z: +el.dataset.z!, size: +el.dataset.size!,
      plane: el.classList.contains("mp__plane"), tilt: +(el.dataset.tilt ?? 0), hidden: false,
    }));
    const state = { p: 0, fade: 0, mx: 0, my: 0 };
    let W = 0, H = 0;

    const layout = () => {
      W = stage.clientWidth; H = stage.clientHeight;
      const unit = Math.max(W, H) / 100;
      for (const it of items) {
        it.el.style.width = `${it.size * unit}px`;
        it.hidden = getComputedStyle(it.el).display === "none";
      }
    };
    const render = () => {
      const cam = state.p * CFG.travel;
      for (const it of items) {
        if (it.hidden) continue;
        const dz = it.z - cam;
        if (dz <= CFG.nearClip) { it.el.style.opacity = "0"; continue; }
        const s = CFG.focal / dz;
        const fogIn = clamp01((CFG.fogFar - dz) / (CFG.fogFar - CFG.fogNear));
        const nearOut = clamp01((dz - CFG.nearClip) / (CFG.nearFade - CFG.nearClip));
        it.el.style.opacity = String(fogIn * nearOut * state.fade);
        const px = (it.x - state.mx * CFG.mouse) * (W / 2) * s;
        const py = (it.y - state.my * CFG.mouse) * (H / 2) * s;
        it.el.style.transform = `translate(${W / 2 + px}px, ${H / 2 + py}px) rotate(${it.tilt}deg) scale(${s})`;
        it.el.style.zIndex = it.plane ? "1" : String(Math.round(s * 100));
      }
    };

    const onResize = () => { layout(); render(); };
    addEventListener("resize", onResize);
    layout();

    if (reduce) {
      state.p = CFG.staticP; state.fade = 1; render();
      return () => removeEventListener("resize", onResize);
    }

    section.classList.add("mp--live");
    layout();

    // mouse = small camera pan (desktop only), smoothed, rAF only while moving
    const cleanups: (() => void)[] = [];
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const target = { x: 0, y: 0 };
      let raf = 0, last = 0, inView = false;
      const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; });
      io.observe(section);
      const tick = (now: number) => {
        const a = 1 - Math.exp(-Math.min(0.05, (now - last) / 1000) / CFG.mouseEase);
        last = now;
        state.mx += (target.x - state.mx) * a;
        state.my += (target.y - state.my) * a;
        const settled = Math.abs(target.x - state.mx) < 1e-3 && Math.abs(target.y - state.my) < 1e-3;
        if (settled) { state.mx = target.x; state.my = target.y; }
        render();
        raf = settled ? 0 : requestAnimationFrame(tick);
      };
      const kick = () => { if (inView && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
      const move = (e: PointerEvent) => { target.x = (e.clientX / innerWidth) * 2 - 1; target.y = (e.clientY / innerHeight) * 2 - 1; kick(); };
      const leave = () => { target.x = target.y = 0; kick(); };
      addEventListener("pointermove", move, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);
      cleanups.push(() => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener("pointermove", move); document.documentElement.removeEventListener("pointerleave", leave); });
    }

    const a = section.querySelectorAll(".mp__line--a .mp__word > span");
    const b = section.querySelectorAll(".mp__line--b .mp__word > span");
    const ctx = gsap.context(() => {
      // CSS pre-hides words with translateY(110%); hand control to GSAP without a leftover pixel offset
      gsap.set([...a, ...b], { y: 0, yPercent: 110 });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: CFG.scrub, invalidateOnRefresh: true },
      });
      tl.fromTo(state, { p: 0 }, { p: 1, duration: 1, onUpdate: render }, 0);
      tl.fromTo(state, { fade: 0 }, { fade: 1, duration: 0.12, ease: "sine.inOut", onUpdate: render }, 0);
      tl.fromTo(state, { fade: 1 }, { fade: 0, duration: 0.1, immediateRender: false, onUpdate: render }, 0.9);
      tl.fromTo(a, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 0.15, stagger: 0.03, ease: "power3.out" }, 0);
      tl.fromTo(a, { y: 0, yPercent: 0 }, { y: 0, yPercent: -110, duration: 0.1, stagger: 0.02, ease: "power3.in", immediateRender: false }, 0.38);
      tl.fromTo(b, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 0.1, stagger: 0.02, ease: "power3.out", immediateRender: false }, 0.5);
      tl.fromTo(b, { y: 0, yPercent: 0 }, { y: 0, yPercent: -110, duration: 0.1, stagger: 0.02, ease: "power3.in", immediateRender: false }, 0.8);
    }, section);
    render();
    const refresh = () => ScrollTrigger.refresh();
    addEventListener("load", refresh);

    return () => {
      ctx.revert();
      cleanups.forEach((c) => c());
      removeEventListener("resize", onResize);
      removeEventListener("load", refresh);
      section.classList.remove("mp--live");
    };
  }, []);

  return (
    <section ref={ref} className="mp" aria-label="Designing cars? We got you covered.">
      <div className="mp__stage">
        <svg className="mp__plane" data-x="0" data-y="0.04" data-z="2300" data-size="46" viewBox="0 0 400 160" aria-hidden>
          <path d={MARK} />
        </svg>

        <h2 className="mp__title" aria-label="Designing cars? We got you covered.">
          <span className="mp__line mp__line--a" aria-hidden>
            {LINE_A.map((w) => (
              <span key={w} className="mp__word"><span>{w}</span></span>
            ))}
          </span>
          <span className="mp__line mp__line--b" aria-hidden>
            {LINE_B.map((w) => (
              <span key={w} className="mp__word"><span>{w}</span></span>
            ))}
          </span>
        </h2>

        {OBJECTS.map((o) => (
          // placeholder cutouts until the 3D part renders are delivered
          <div
            key={o.name}
            className="mp__obj"
            data-x={o.x} data-y={o.y} data-z={o.z} data-size={o.size} data-tilt={o.tilt}
            data-mobile={o.mobile ? undefined : "hide"}
            aria-hidden
          >
            <div className="grid aspect-[4/3] w-full place-items-center rounded-lg border border-dashed border-neutral-700 bg-[#1a1a1a] font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              {o.name}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
