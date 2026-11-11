import "server-only";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { can, homeFor, type Perm } from "@/lib/rbac";

/** Page guard (middleware checks first; this is the second line). Returns the signed-in staff user. */
export async function guardPage(perm: Perm) {
  const { user, role } = await currentUser();
  if (hasSupabase && !can(role, perm)) redirect(role ? homeFor(role) : "/login");
  return { user, role };
}

/** API guard: null when allowed, otherwise the HTTP status to return. */
export async function guardApi(perm: Perm) {
  const { user, role } = await currentUser();
  if (!user) return { user: null, role, deny: 401 as const };
  if (!can(role, perm)) return { user, role, deny: 403 as const };
  return { user, role, deny: null };
}
