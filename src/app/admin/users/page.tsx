import { guardPage } from "@/lib/admin-guard";
import { listUsers } from "@/lib/admin-users";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata = { title: "Users" };

export default async function AdminUsers() {
  const { user } = await guardPage("users.manage");
  const users = await listUsers();
  return <UsersManager users={users} meId={user?.id ?? null} />;
}
