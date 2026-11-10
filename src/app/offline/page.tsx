import Link from "next/link";

export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-stage px-5 text-white">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="eyebrow text-neutral-400">Anargya</p>
        <h1 className="text-[28px] font-semibold leading-9">You are offline.</h1>
        <p className="text-neutral-400">Pages you visited before are still available. Checkout and receipts need a connection.</p>
        <Link href="/" className="btn btn-outline-dark">Try again</Link>
      </div>
    </main>
  );
}
