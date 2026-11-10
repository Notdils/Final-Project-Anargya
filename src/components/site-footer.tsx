import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-teal text-white">
      <div className="container-x flex flex-col gap-8 pt-12 md:gap-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <nav aria-label="Footer">
            <ul className="flex flex-col gap-4 text-sm md:flex-row md:gap-6">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li><Link href="/about" className="hover:underline">About</Link></li>
              <li><Link href="/marketplace" className="hover:underline">Marketplace</Link></li>
              <li><Link href="/login" className="hover:underline">Log in</Link></li>
            </ul>
          </nav>
          <p className="text-sm text-white/70">© 2026 Anargya Corp.</p>
        </div>
        <p
          aria-hidden
          className="select-none text-center font-semibold leading-none tracking-[-0.04em] text-[19.5vw] xl:text-[256px]"
        >
          ANARGYA
        </p>
      </div>
    </footer>
  );
}

export function SlimFooter() {
  return (
    <footer className="bg-teal text-white">
      <div className="container-x flex items-center justify-between py-6">
        <span className="text-sm font-semibold tracking-[0.12em]">ANARGYA</span>
        <span className="text-xs text-white/70">© 2026 Anargya Corp.</span>
      </div>
    </footer>
  );
}
