import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";
import { translator } from "@/i18n";

export const metadata: Metadata = { title: translator("ja")("Create an account") };

export default function Page() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
