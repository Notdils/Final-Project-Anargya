import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/reset-forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default function ResetPage() {
  return (
    <AuthShell>
      <ResetForm />
    </AuthShell>
  );
}
