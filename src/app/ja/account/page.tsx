import type { Metadata } from "next";
import { translator } from "@/i18n";
import View from "@/views/account";

const t = translator("ja");
export const metadata: Metadata = { title: t("Account") };
export const dynamic = "force-dynamic";

export default function Page() {
  return <View locale="ja" />;
}
