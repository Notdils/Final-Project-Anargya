import type { Metadata } from "next";
import { translator } from "@/i18n";
import View from "@/views/marketplace";

const t = translator("ja");
export const metadata: Metadata = { title: t("Marketplace") };
export const revalidate = 300;

export default function Page() {
  return <View locale="ja" />;
}
