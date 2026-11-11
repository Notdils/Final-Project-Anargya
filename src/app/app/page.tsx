import { homeFor, isStaff } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";

// PWA start_url. Middleware handles the redirect when Supabase is configured; this is the fallback.
export default async function AppEntry() {
  const { user, role } = await currentUser();
  redirect(!user || !role ? "/marketplace" : isStaff(role) ? homeFor(role) : "/marketplace");
}
