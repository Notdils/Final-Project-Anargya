import type { Metadata } from "next";
import { translator } from "@/i18n";
import View from "@/views/about";

const t = translator("ja");
export const metadata: Metadata = { title: t("About") };

export default function Page() {
  return <View locale="ja" />;
}
