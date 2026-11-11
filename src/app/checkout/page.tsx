import type { Metadata } from "next";
import { translator } from "@/i18n";
import View from "@/views/checkout";

const t = translator("en");
export const metadata: Metadata = { title: t("Checkout") };
export const dynamic = "force-dynamic";

export default function Page() {
  return <View locale="en" />;
}
