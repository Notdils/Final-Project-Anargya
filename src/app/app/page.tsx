import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";

// PWA start_url. Middleware handles the redirect when Supabase is configured; this is the fallback.
export default async function AppEntry() {
  const { user, role } = await currentUser();
  redirect(!user ? "/marketplace" : role === "admin" ? "/admin" : "/marketplace");
}
