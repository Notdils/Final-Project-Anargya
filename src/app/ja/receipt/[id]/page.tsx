import type { Metadata } from "next";
import View from "@/views/receipt";
import { translator } from "@/i18n";

export const metadata: Metadata = { title: translator("ja")("Receipt"), robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  // ?paid=1: opened from the "Payment received" modal, before Midtrans has notified us
  return <View id={(await params).id} locale="ja" justPaid={(await searchParams).paid === "1"} />;
}
