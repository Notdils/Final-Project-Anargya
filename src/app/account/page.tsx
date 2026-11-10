import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SlimFooter } from "@/components/site-footer";
import { OrderStatusBadge } from "@/components/status-badge";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { jst, yen } from "@/lib/format";
import type { Order } from "@/lib/orders";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user } = await currentUser();
  const sb = await supabaseServer();
  const orders = sb ? ((await sb.from("orders").select("id, receipt_no, total_jpy, status, created_at").order("created_at", { ascending: false }).limit(50)).data as Order[] | null) ?? [] : [];
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[70vh] pt-16">
        <div className="container-x flex flex-col gap-6 py-6 md:py-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] md:text-[40px] md:leading-[48px]">Your orders</h1>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
            <form action="/api/auth/logout" method="post"><button className="btn btn-outline">Log out</button></form>
          </div>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-10 text-center">
              <p className="font-medium">No orders yet.</p>
              <Link href="/marketplace" className="btn btn-ochre mt-4">Browse marketplace</Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/receipt/${o.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line p-4 hover:bg-surface">
                    <span className="flex flex-col">
                      <span className="font-mono text-sm">{o.receipt_no}</span>
                      <span className="text-xs text-muted">{jst(o.created_at)} · {yen(o.total_jpy)}</span>
                    </span>
                    <OrderStatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SlimFooter />
    </>
  );
}
