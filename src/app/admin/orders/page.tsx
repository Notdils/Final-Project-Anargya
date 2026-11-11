import { guardPage } from "@/lib/admin-guard";
import { ORDER_TABS, adminOrders, parseTab } from "@/lib/admin-orders";
import { parseDays } from "@/lib/admin";
import { OrdersBoard } from "@/components/admin/orders-board";
import { can } from "@/lib/rbac";
import { hasSupabase } from "@/lib/env";
import { reconcileStale } from "@/lib/reconcile";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; days?: string }> }) {
  const { role } = await guardPage("orders.read");
  const sp = await searchParams;
  const tab = parseTab(sp.tab), q = (sp.q ?? "").slice(0, 60), days = parseDays(sp.days);
  await reconcileStale().catch(() => {});
  const { rows, counts } = await adminOrders({ tab, q, days });
  return <OrdersBoard rows={rows} counts={counts} tabs={ORDER_TABS} tab={tab} q={q} days={days} canFulfil={!hasSupabase || can(role, "orders.fulfil")} />;
}
