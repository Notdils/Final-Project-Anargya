import type { Metadata } from "next";
import View from "@/views/booking-status";
import { translator } from "@/i18n";

export const metadata: Metadata = { title: translator("ja")("Consultation"), robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <View id={(await params).id} locale="ja" />;
}
