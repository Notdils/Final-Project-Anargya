import { SiteHeader } from "@/components/site-header";

// Loading states shaped like the page that is coming (no spinners). Grey blocks pulse gently;
// the pulse stops for people who prefer reduced motion.
const B = ({ className = "" }: { className?: string }) => <span aria-hidden className={`block rounded-lg bg-surface-2 motion-safe:animate-pulse ${className}`} />;

function Shell({ children, active }: { children: React.ReactNode; active?: "marketplace" | "consulting" }) {
  return (
    <>
      <SiteHeader active={active} />
      <main id="main" className="pt-16" aria-busy="true">
        <p className="sr-only" role="status">Loading…</p>
        {children}
      </main>
    </>
  );
}

export function AccountSkeleton() {
  return (
    <Shell>
      <div className="container-x flex flex-col gap-8 py-6 md:py-10">
        <div className="flex flex-col gap-3"><B className="h-4 w-20" /><B className="h-9 w-64 md:h-12" /></div>
        <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <B key={i} className="h-[118px]" />)}</div>
          <div className="flex flex-col gap-4"><B className="h-52" /><B className="h-44" /></div>
        </div>
      </div>
    </Shell>
  );
}

export function CheckoutSkeleton() {
  return (
    <Shell>
      <div className="container-x flex flex-col gap-6 py-6 md:py-10">
        <B className="h-9 w-48 md:h-12" />
        <B className="h-6 w-80" />
        <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
          <div className="flex flex-col gap-4">
            <B className="h-6 w-40" />
            {[0, 1, 2, 3].map((i) => <div key={i} className="grid gap-4 md:grid-cols-2"><B className="h-[66px]" /><B className="h-[66px]" /></div>)}
          </div>
          <B className="h-[420px]" />
        </div>
      </div>
    </Shell>
  );
}

export function ReceiptSkeleton() {
  return (
    <Shell>
      <div className="container-x flex justify-center py-6 md:py-12">
        <div className="flex w-full max-w-[720px] flex-col gap-6">
          <B className="h-20" />
          <div className="flex flex-col gap-6 rounded-xl border border-line p-6 md:p-12">
            <div className="flex justify-between"><B className="h-10 w-48" /><B className="h-14 w-40" /></div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <B key={i} className="h-14" />)}</div>
            {[0, 1, 2].map((i) => <B key={i} className="h-8" />)}
            <B className="ml-auto h-20 w-64" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

/** Admin content area (the sidebar stays on screen from the admin layout). */
export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p className="sr-only" role="status">Loading…</p>
      <div className="flex flex-col gap-2"><B className="h-8 w-48" /><B className="h-4 w-80" /></div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{[0, 1, 2].map((i) => <B key={i} className="h-28" />)}</div>
      <div className="flex flex-col gap-2 rounded-xl border border-line p-4">{[0, 1, 2, 3, 4, 5].map((i) => <B key={i} className="h-10" />)}</div>
    </div>
  );
}
