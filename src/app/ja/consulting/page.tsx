import type { Metadata } from "next";
import { translator } from "@/i18n";
import View from "@/views/consulting";

const t = translator("ja");
export const metadata: Metadata = { title: t("Consulting"), description: t("Engineering consulting for formula EV teams: concept, aero, EV powertrain and chassis.") };

export default function Page() {
  return <View locale="ja" />;
}
