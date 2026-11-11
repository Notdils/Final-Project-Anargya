import { guardPage } from "@/lib/admin-guard";
import { ORDERS_PAGE, ORDER_TABS, adminOrders, parseTab } from "@/lib/admin-orders";
import { Pagination } from "@/components/admin/pagination";
import { parseDays } from "@/lib/admin";
import { OrdersBoard } from "@/components/admin/orders-board";
import { can } from "@/lib/rbac";
import { hasSupabase } from "@/lib/env";
import { reconcileStale } from "@/lib/reconcile";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; days?: string; page?: string }> }) {
  const { role } = await guardPage("orders.read");
  const sp = await searchParams;
  const tab = parseTab(sp.tab), q = (sp.q ?? "").slice(0, 60), days = parseDays(sp.days), page = Math.max(1, Number(sp.page) || 1);
  await reconcileStale().catch(() => {});
  const { rows, counts } = await adminOrders({ tab, q, days, page });
  const href = (p: number) => `/admin/orders?${new URLSearchParams({ ...(tab !== "all" && { tab }), ...(q && { q }), days: String(days), page: String(p) })}`;
  return (
    <div className="flex flex-col gap-4">
      <OrdersBoard rows={rows} counts={counts} tabs={ORDER_TABS} tab={tab} q={q} days={days} canFulfil={!hasSupabase || can(role, "orders.fulfil")} />
      <Pagination page={page} pageSize={ORDERS_PAGE} total={counts[tab] ?? rows.length} href={href} noun="orders" />
    </div>
  );
}
