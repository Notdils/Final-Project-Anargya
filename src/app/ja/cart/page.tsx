import type { Metadata } from "next";
import { translator } from "@/i18n";
import View from "@/views/cart";

const t = translator("ja");
export const metadata: Metadata = { title: t("Cart") };

export default function Page() {
  return <View locale="ja" />;
}
