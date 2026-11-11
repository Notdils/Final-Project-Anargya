import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { toRole, type Role } from "@/lib/rbac";

export type AdminUser = { id: string; email: string; name: string | null; role: Role; orders: number; bookings: number; created_at: string; last_sign_in_at: string | null };

/** All accounts with their role and activity counts. Service role: call only after a users.manage check. */
export async function listUsers(): Promise<AdminUser[]> {
  const sb = supabaseService();
  if (!sb) return [];
  const [{ data: u }, { data: o }, { data: b }] = await Promise.all([
    sb.auth.admin.listUsers({ page: 1, perPage: 500 }),
    sb.from("orders").select("user_id").limit(10000),
    sb.from("bookings").select("user_id").limit(10000),
  ]);
  const count = (rows: { user_id: string | null }[] | null) => (rows ?? []).reduce<Record<string, number>>((m, r) => (r.user_id ? ((m[r.user_id] = (m[r.user_id] ?? 0) + 1), m) : m), {});
  const oc = count(o), bc = count(b);
  return (u?.users ?? [])
    .map((x) => ({
      id: x.id, email: x.email ?? "", name: (x.user_metadata as { full_name?: string } | undefined)?.full_name ?? null,
      role: toRole((x.app_metadata as { role?: string } | undefined)?.role), orders: oc[x.id] ?? 0, bookings: bc[x.id] ?? 0,
      created_at: x.created_at, last_sign_in_at: x.last_sign_in_at ?? null,
    }))
    .sort((a, b) => Number(b.role !== "customer") - Number(a.role !== "customer") || b.created_at.localeCompare(a.created_at));
}
