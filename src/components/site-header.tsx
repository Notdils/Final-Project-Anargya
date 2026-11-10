import { currentUser } from "@/lib/supabase/server";
import { HeaderClient } from "./header-client";

export async function SiteHeader({ variant = "solid", active }: { variant?: "solid" | "overlay"; active?: "home" | "about" | "marketplace" }) {
  const { user, role } = await currentUser();
  return <HeaderClient variant={variant} active={active} signedIn={Boolean(user)} isAdmin={role === "admin"} />;
}
