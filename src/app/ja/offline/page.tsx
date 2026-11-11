import type { Metadata } from "next";
import { translator } from "@/i18n";
import View from "@/views/offline";

const t = translator("ja");
export const metadata: Metadata = { title: t("Offline") };

export default function Page() {
  return <View locale="ja" />;
}
