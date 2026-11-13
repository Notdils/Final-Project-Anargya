"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Send } from "lucide-react";

type Thread = { id: string; email: string | null; name: string | null; lastAt: string; staffUnread: boolean; preview: string | null };
type Msg = { id: string; sender: "customer" | "staff"; staffName: string | null; body: string; at: string };

const POLL_MS = 5000;
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(iso));

/** Admin → Inbox: every customer conversation; any staff role can reply. Refreshes every few seconds. */
export function SupportInbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [live, setLive] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/admin/support", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (alive) { setThreads(d.threads ?? []); setLive(d.live !== false); } }).catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!sel) return;
    let alive = true;
    const load = () => fetch(`/api/admin/support/${sel}`, { cache: "no-store" }).then((r) => r.json()).then((d) => alive && setMsgs(d.messages ?? [])).catch(() => {});
    setMsgs([]);
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [sel]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs.length]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!sel || !body || busy) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/admin/support/${sel}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setErr(d?.error ?? "Could not send.");
    setText("");
    setMsgs((m) => [...m, d.message]);
  }

  const current = threads.find((t) => t.id === sel);
  const unread = threads.filter((t) => t.staffUnread).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Inbox</h1>
        <p className="text-sm text-muted">Customer service chat from the Consulting page. Customers see your first name with each reply. Times in JST.{unread ? ` ${unread} waiting for a reply.` : ""}</p>
      </header>
      {!live && <p className="flex items-start gap-2 rounded-lg bg-ochre-tint p-3 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0 text-ochre" aria-hidden />Chat is not in the database yet. Run supabase/master.sql (migration 0027).</p>}
      <div className="grid min-h-[520px] overflow-hidden rounded-xl border border-line md:grid-cols-[320px_minmax(0,1fr)]">
        <ul className={`flex flex-col overflow-y-auto border-line md:border-r ${sel ? "hidden md:flex" : ""}`} aria-label="Conversations">
          {threads.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setSel(t.id)} aria-current={sel === t.id || undefined}
                className={`flex w-full flex-col gap-1 border-b border-line px-4 py-3 text-left hover:bg-surface ${sel === t.id ? "bg-teal-tint" : ""}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate ${t.staffUnread ? "font-semibold" : "font-medium"}`}>{t.name || t.email || "Customer"}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">{when(t.lastAt)}</span>
                </span>
                {t.name && t.email && <span className="truncate text-xs text-muted">{t.email}</span>}
                <span className="flex items-center gap-2">
                  {t.staffUnread && <span className="size-2 shrink-0 rounded-full bg-oxide" aria-label="Waiting for a reply" />}
                  <span className="truncate text-sm text-muted">{t.preview ?? ""}</span>
                </span>
              </button>
            </li>
          ))}
          {!threads.length && <li className="px-4 py-10 text-center text-sm text-muted">No conversations yet.</li>}
        </ul>
        <section className={`flex min-h-[520px] flex-col ${sel ? "" : "hidden md:flex"}`} aria-label="Conversation">
          {current ? (
            <>
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button type="button" className="btn btn-outline min-h-8 px-2 md:hidden" onClick={() => setSel(null)} aria-label="Back to conversations"><ArrowLeft size={16} aria-hidden /></button>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{current.name || current.email || "Customer"}</p>
                  {current.email && <a href={`mailto:${current.email}`} className="truncate text-xs text-teal hover:underline">{current.email}</a>}
                </div>
              </header>
              <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-surface p-4" aria-live="polite">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex max-w-[80%] flex-col gap-1 ${m.sender === "staff" ? "self-end items-end" : "self-start items-start"}`}>
                    <span className="text-xs text-muted">{m.sender === "staff" ? m.staffName ?? "Staff" : "Customer"} · {when(m.at)}</span>
                    <p className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] ${m.sender === "staff" ? "rounded-br-md bg-teal text-white" : "rounded-bl-md border border-line bg-white"}`}>{m.body}</p>
                  </div>
                ))}
              </div>
              {err && <p role="alert" className="border-t border-line bg-oxide-tint px-4 py-2 text-[13px] text-oxide">{err}</p>}
              <form onSubmit={reply} className="flex items-end gap-2 border-t border-line p-3">
                <label htmlFor="reply" className="sr-only">Reply</label>
                <textarea id="reply" rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) reply(e); }}
                  placeholder="Write a reply… (Ctrl+Enter to send)" className="input max-h-40 min-h-12 flex-1 resize-y py-2" />
                <button type="submit" className="btn btn-teal shrink-0" disabled={busy || !text.trim()}><Send size={16} aria-hidden />Send</button>
              </form>
            </>
          ) : (
            <p className="m-auto px-4 text-center text-sm text-muted">Choose a conversation.</p>
          )}
        </section>
      </div>
    </div>
  );
}
