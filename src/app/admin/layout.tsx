import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { currentUser } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Anargya" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await currentUser();
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <AdminNav email={user?.email ?? null} />
      <main id="main" className="min-w-0 flex-1 px-5 py-5 md:px-8 md:py-8">
        {!hasSupabase && (
          <p role="status" className="mb-6 rounded-lg bg-ochre-tint p-3 text-sm">
            Demo mode: Supabase is not configured, so there is no data and this page is not protected. Set the env variables before deploying.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
