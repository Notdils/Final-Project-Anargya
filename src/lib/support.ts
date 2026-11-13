import "server-only";

// Customer service chat (0027). Shared shapes for the customer panel and Admin → Inbox.
export type ChatMessage = { id: string; sender: "customer" | "staff"; staffName: string | null; body: string; at: string };
export type ChatThread = { id: string; email: string | null; name: string | null; lastAt: string; staffUnread: boolean; preview: string | null };

export const BODY_MAX = 2000;
type Row = { id: string; sender: "customer" | "staff"; staff_name: string | null; body: string; created_at: string };
export const toMessage = (r: Row): ChatMessage => ({ id: r.id, sender: r.sender, staffName: r.staff_name, body: r.body, at: r.created_at });

/** Trim, drop control characters (keep new lines), cap the length. Empty means "nothing to send". */
export function cleanBody(v: unknown) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, BODY_MAX);
}
