"use client";
import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// Display-only auth state for static pages: read from the session cookie in the browser,
// no network round trip. Access control stays on the server (middleware, route handlers, RLS).
export type AuthState = { ready: boolean; signedIn: boolean; isAdmin: boolean };

let cached: AuthState | null = null;
const from = (user: { app_metadata?: Record<string, unknown> } | null | undefined): AuthState => ({
  ready: true,
  signedIn: Boolean(user),
  isAdmin: user?.app_metadata?.role === "admin",
});

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(cached ?? { ready: false, signedIn: false, isAdmin: false });
  useEffect(() => {
    let live = true;
    let unsub = () => {};
    // Loaded after first paint so the Supabase client stays out of the initial bundle.
    import("@/lib/supabase/client").then(async ({ supabaseBrowser }) => {
      const sb = supabaseBrowser();
      if (!live) return;
      if (!sb) return setState((cached = { ready: true, signedIn: false, isAdmin: false }));
      const { data } = (await sb.auth.getSession()) as { data: { session: Session | null } };
      if (live) setState((cached = from(data.session?.user)));
      const { data: sub } = sb.auth.onAuthStateChange((_e: AuthChangeEvent, session: Session | null) => live && setState((cached = from(session?.user))));
      unsub = () => sub.subscription.unsubscribe();
    });
    return () => {
      live = false;
      unsub();
    };
  }, []);
  return state;
}

/** Renders children only for visitors who are not signed in (after the check, to avoid a flash). */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { ready, signedIn } = useAuth();
  return ready && !signedIn ? <>{children}</> : null;
}
