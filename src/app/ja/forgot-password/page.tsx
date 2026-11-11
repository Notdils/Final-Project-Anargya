import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/reset-forms";
import { translator } from "@/i18n";

export const metadata: Metadata = { title: translator("ja")("Reset password") };

export default function Page() {
  return (
    <AuthShell>
      <ForgotForm />
    </AuthShell>
  );
}
