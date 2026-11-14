"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useT } from "@/i18n/client";

// Z fly-through (skill: motion-parallax). Camera dollies along Z on scroll; objects are projected
// with perspective so they grow radially from the vanishing point. Two headlines swap mid-way.

type Obj = { name: string; src: string; w: number; h: number; x: number; y: number; z: number; size: number; tilt: number; mobile?: boolean };

// Static renders of the part models (public/home/parts, made from the GLBs with a light rim so dark parts
// read on black). Six models over three waves, two per wave; wave 3 stays deep enough (z >= 0.95 * travel +
// nearFade) that it is still in view near the end of the scroll.
const OBJECTS: Obj[] = [
  { name: "Wheel hub", src: "wheel-hub", w: 491, h: 540, x: -0.5, y: -0.45, z: 1700, size: 10, tilt: -10, mobile: true },
  { name: "Front wing", src: "front-wing", w: 674, h: 456, x: 0.55, y: 0.42, z: 1950, size: 13, tilt: 4, mobile: true },
  { name: "VCU & BMS", src: "vcu-bms", w: 466, h: 319, x: -0.62, y: 0.02, z: 2600, size: 9, tilt: -8, mobile: true },
  { name: "Pedal box", src: "pedal-box", w: 567, h: 532, x: 0.6, y: -0.1, z: 3100, size: 10, tilt: -3, mobile: true },
  { name: "Diffuser", src: "diffuser", w: 825, h: 380, x: -0.4, y: -0.5, z: 3950, size: 13, tilt: 6, mobile: true },
  { name: "Rear wing", src: "rear-wing", w: 791, h: 466, x: 0.3, y: 0.5, z: 4100, size: 12, tilt: -6, mobile: true },
];

// Line art of the Anargya mark (traced from public/brand/logo.webp, 512 x 329). Two planes the camera
// flies through: one behind the headline in wave 1, a smaller one deep in wave 3.
const LOGO_PATH = "M262.8 314.0 L262.2 310.5 L175.0 185.5 L172.0 182.5 L152.2 180.2 L18.2 183.5 L10.8 184.2 L6.8 187.8 L5.5 193.0 L4.8 301.8 L7.5 307.5 L16.8 313.0 L20.5 314.5 L254.2 318.8 L259.2 318.2 L261.5 316.8 Z M260.8 11.8 L274.8 32.0 L277.5 34.5 L474.0 34.0 L479.0 35.5 L482.5 38.8 L484.2 44.0 L485.8 138.5 L487.5 139.8 L503.2 139.5 L508.2 138.5 L509.5 73.2 L509.2 31.5 L506.5 25.2 L497.5 17.0 L494.2 15.5 Z M10.2 14.2 L7.2 20.5 L7.0 26.0 L5.5 30.0 L5.2 43.5 L3.8 45.2 L2.8 128.8 L4.2 134.5 L4.2 140.2 L6.8 143.5 L9.0 144.2 L169.2 142.5 L182.5 142.5 L189.0 143.5 L318.2 319.0 L323.5 324.2 L379.2 323.2 L479.5 325.8 L481.5 324.8 L487.0 324.8 L493.8 322.2 L501.2 317.0 L504.5 307.8 L506.2 183.8 L503.0 179.2 L500.2 177.8 L496.0 177.2 L324.0 178.2 L253.2 87.2 L197.8 9.8 L193.0 6.0 L187.2 5.0 L125.2 3.5 L37.8 4.0 L24.8 5.0 L20.0 6.5 L15.8 9.0 Z";
const PLANES = [
  { key: "logo-a", x: 0, y: 0.04, z: 2250, size: 44, tilt: 0 },
  { key: "logo-b", x: 0.05, y: -0.06, z: 3800, size: 30, tilt: -4 },
];

const CFG = { focal: 1000, travel: 3700, fogFar: 3200, fogNear: 2600, nearFade: 400, nearClip: 260, scrub: 0.6, mouse: 0.08, mouseEase: 0.15 };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));


export function FlyThrough() {
  const t = useT();
  const lineA = t("Designing cars?").split(" ");
  const lineB = t("We got you covered.").split(" ");
  const label = `${t("Designing cars?")} ${t("We got you covered.")}`;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const stage = section.querySelector<HTMLElement>(".mp__stage")!;
    const items = [...section.querySelectorAll<HTMLElement>(".mp__obj")].map((el) => ({
      el,
      x: +el.dataset.x!, y: +el.dataset.y!, z: +el.dataset.z!, size: +el.dataset.size!,
      tilt: +(el.dataset.tilt ?? 0), plane: el.classList.contains("mp__plane"), hidden: false,
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
        it.el.style.zIndex = it.plane ? "1" : String(Math.round(s * 100)); // line art always behind the parts
      }
    };

    const onResize = () => { layout(); render(); };
    addEventListener("resize", onResize);
    layout();

    // Full fly-through for everyone, including prefers-reduced-motion (product decision, 12 Nov).

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
    <section ref={ref} className="mp" aria-label={label}>
      <div className="mp__stage">
        <h2 className="mp__title" aria-label={label}>
          <span className="mp__line mp__line--a" aria-hidden>
            {lineA.map((w, i) => (
              <span key={i} className="mp__word"><span>{w}</span></span>
            ))}
          </span>
          <span className="mp__line mp__line--b" aria-hidden>
            {lineB.map((w, i) => (
              <span key={i} className="mp__word"><span>{w}</span></span>
            ))}
          </span>
        </h2>

        {PLANES.map((l) => (
          <svg
            key={l.key}
            viewBox="0 0 512 329"
            className="mp__obj mp__plane"
            data-x={l.x} data-y={l.y} data-z={l.z} data-size={l.size} data-tilt={l.tilt}
            aria-hidden
          >
            <path d={LOGO_PATH} />
          </svg>
        ))}

        {OBJECTS.map((o) => (
          // eslint-disable-next-line @next/next/no-img-element -- projected every frame by render(); a plain img keeps the transform cheap
          <img
            key={o.name}
            src={`/home/parts/${o.src}.webp`}
            alt=""
            width={o.w}
            height={o.h}
            decoding="async"
            className="mp__obj"
            data-x={o.x} data-y={o.y} data-z={o.z} data-size={o.size} data-tilt={o.tilt}
            data-mobile={o.mobile ? undefined : "hide"}
            aria-hidden
          />
        ))}
      </div>
    </section>
  );
}
