import type { Metadata } from "next";
import View from "@/views/receipt";
import { translator } from "@/i18n";

export const metadata: Metadata = { title: translator("ja")("Receipt"), robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <View id={(await params).id} locale="ja" />;
}
