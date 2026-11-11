import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-svh place-items-center px-5">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="eyebrow text-muted">404</p>
        <h1 className="text-[28px] font-semibold leading-9">This page does not exist.</h1>
        <Link href="/marketplace" className="btn btn-teal">Go to marketplace</Link>
      </div>
    </main>
  );
}
