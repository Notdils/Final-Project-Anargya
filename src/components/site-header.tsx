import { HeaderClient } from "./header-client";

// Static: auth state is read in the browser (see auth-state.tsx) so public pages can be served from the CDN.
export function SiteHeader({ variant = "solid", active }: { variant?: "solid" | "overlay"; active?: "home" | "about" | "marketplace" | "consulting" }) {
  return <HeaderClient variant={variant} active={active} />;
}
