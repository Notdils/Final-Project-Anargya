"use client";
import { Check, Clock, XCircle, MinusCircle } from "lucide-react";
import type { OrderStatus } from "@/lib/orders";
import { useT } from "@/i18n/client";

const MAP = {
  paid: { cls: "bg-teal-tint text-teal", Icon: Check, label: "Paid" },
  pending: { cls: "bg-ochre-tint text-ink", Icon: Clock, label: "Pending" },
  failed: { cls: "bg-oxide-tint text-oxide", Icon: XCircle, label: "Failed" },
  expired: { cls: "bg-surface-2 text-muted", Icon: MinusCircle, label: "Expired" },
} as const;

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useT();
  const { cls, Icon, label } = MAP[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon size={12} strokeWidth={2} aria-hidden className={status === "pending" ? "text-ochre" : undefined} />
      {t(label)}
    </span>
  );
}
