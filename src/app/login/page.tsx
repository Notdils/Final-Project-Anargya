import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { translator } from "@/i18n";

export const metadata: Metadata = { title: translator("en")("Log in") };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthShell>
      <LoginForm next={next} linkError={error === "link"} />
    </AuthShell>
  );
}
