import { guardPage } from "@/lib/admin-guard";
import { SupportInbox } from "@/components/admin/support-inbox";

export const metadata = { title: "Inbox" };

export default async function AdminInbox() {
  await guardPage("support.reply");
  return <SupportInbox />;
}
