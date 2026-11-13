import "server-only";
import { isTopic, type ChatKind, type ChatMessage, type ProductCard } from "@/lib/support-topics";

// Customer service chat (0027, 0028). Shared shapes for the customer panel and Admin → Inbox.
export type { ChatMessage };
export type ChatThread = { id: string; email: string | null; name: string | null; lastAt: string; staffUnread: boolean; preview: string | null };

export const BODY_MAX = 2000;
export const MSG_COLS = "id, sender, staff_name, body, created_at, kind, meta";
type Row = { id: string; sender: "customer" | "staff"; staff_name: string | null; body: string; created_at: string; kind?: string | null; meta?: Record<string, unknown> | null };

const card = (m: Record<string, unknown> | null | undefined): ProductCard | null =>
  m && typeof m.slug === "string" && typeof m.name === "string"
    ? { slug: m.slug, name: m.name, priceUsd: Number(m.priceUsd) || 0, image: typeof m.image === "string" ? m.image : null }
    : null;

export const toMessage = (r: Row): ChatMessage => {
  const kind = (["text", "topic", "auto", "product"].includes(r.kind ?? "") ? r.kind : "text") as ChatKind;
  const topic = isTopic(r.meta?.topic) ? r.meta.topic : null;
  return { id: r.id, sender: r.sender, staffName: r.staff_name, body: r.body, at: r.created_at, kind, topic, product: kind === "product" ? card(r.meta) : null };
};

/** Trim, drop control characters (keep new lines), cap the length. Empty means "nothing to send". */
export function cleanBody(v: unknown) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, BODY_MAX);
}
