import Link from "next/link";

// Desktop: brand stage left, form right. Tablet: stage on top. Mobile: slim black header.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col xl:flex-row">
      <aside aria-hidden className="relative hidden h-[360px] overflow-hidden bg-stage text-white md:block xl:h-auto xl:w-1/2">
        <Link href="/" className="absolute left-10 top-8 text-base font-semibold tracking-[0.12em]" tabIndex={-1}>ANARGYA</Link>
        <div className="absolute inset-x-20 top-1/2 h-[45%] -translate-y-1/2 rounded-lg border border-dashed border-stage-line xl:h-[40%]">
          {["left-0 top-0 border-l-[1.5px] border-t-[1.5px]", "right-0 top-0 border-r-[1.5px] border-t-[1.5px]", "bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]", "bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]"].map((c) => (
            <span key={c} className={`absolute -m-3 h-4 w-4 border-teal ${c}`} />
          ))}
          <span className="eyebrow absolute inset-0 grid place-items-center text-neutral-700">E21 / 3D model</span>
        </div>
        <p className="absolute bottom-10 left-10 text-[32px] font-semibold leading-10 tracking-[-0.02em]">Engineering-led.<br />Partner-built.</p>
      </aside>
      <header className="bg-stage px-5 py-5 md:hidden">
        <Link href="/" className="text-base font-semibold tracking-[0.12em] text-white">ANARGYA</Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 py-8 md:py-16">
        <div className="w-full max-w-[420px] xl:max-w-[384px]">{children}</div>
      </main>
    </div>
  );
}
