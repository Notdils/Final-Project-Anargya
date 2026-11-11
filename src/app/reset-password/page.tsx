import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/reset-forms";
import { translator } from "@/i18n";

export const metadata: Metadata = { title: translator("en")("Set a new password"), robots: { index: false } };

export default function Page() {
  return (
    <AuthShell>
      <ResetForm />
    </AuthShell>
  );
}
