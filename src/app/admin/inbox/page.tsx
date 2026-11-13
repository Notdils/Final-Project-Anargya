import { guardPage } from "@/lib/admin-guard";
import { can } from "@/lib/rbac";
import { SupportInbox } from "@/components/admin/support-inbox";

export const metadata = { title: "Inbox" };

export default async function AdminInbox() {
  const { role } = await guardPage("support.reply");
  return <SupportInbox canDelete={can(role, "support.delete")} />;
}
