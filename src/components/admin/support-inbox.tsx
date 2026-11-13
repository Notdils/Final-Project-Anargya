"use client";
/* eslint-disable @next/next/no-img-element -- product card snapshots may point to Supabase Storage; small thumbs, no optimiser needed */
import { Fragment, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bot, Package, RotateCcw, Send, Tag, Trash2 } from "lucide-react";
import { TOPICS } from "@/lib/booking";
import { GREETING, type ChatMessage, type ProductCard } from "@/lib/support-topics";

type Thread = { id: string; email: string | null; name: string | null; lastAt: string; staffUnread: boolean; preview: string | null };
type Msg = ChatMessage;
type Pick = ProductCard & { code: string; stock: number };
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const topicName = (id: string | null) => TOPICS.find((x) => x.id === id)?.label ?? id ?? "";

const POLL_MS = 5000;
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(iso));

/** Admin → Inbox: every customer conversation; any staff role can reply. Refreshes every few seconds. */
export function SupportInbox({ canDelete = false }: { canDelete?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [live, setLive] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Pick[] | null>(null);
  const [picker, setPicker] = useState(false);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

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
    const load = () => fetch(`/api/admin/support/${sel}`, { cache: "no-store" }).then((r) => r.json()).then((d) => { if (alive) { setMsgs(d.messages ?? []); setResetAt(d.resetAt ?? null); } }).catch(() => {});
    setMsgs([]); setResetAt(null); setConfirmDel(false); setPicker(false);
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [sel]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs.length]);

  async function post(payload: { body: string } | { product: string }) {
    if (!sel || busy) return false;
    setBusy(true); setErr("");
    const res = await fetch(`/api/admin/support/${sel}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) { setErr(d?.error ?? "Could not send."); return false; }
    setMsgs((m) => [...m, d.message]);
    return true;
  }
  async function reply(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (body && (await post({ body }))) setText("");
  }
  // Admin only: delete the whole conversation for the customer and the team.
  async function deleteHistory() {
    if (!sel || busy) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/admin/support/${sel}/history`, { method: "DELETE" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(false); setConfirmDel(false);
    if (!res?.ok) return setErr(d?.error ?? "Could not delete.");
    setThreads((ts) => ts.filter((x) => x.id !== sel));
    setSel(null); setMsgs([]);
  }
  function openPicker() {
    setPicker((v) => !v);
    if (!products) fetch("/api/admin/support/products", { cache: "no-store" }).then((r) => r.json()).then((d) => setProducts(d.products ?? [])).catch(() => setProducts([]));
  }
  async function sendProduct(slug: string) {
    if (await post({ product: slug })) setPicker(false);
  }

  const current = threads.find((t) => t.id === sel);
  const unread = threads.filter((t) => t.staffUnread).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px] md:leading-9">Inbox</h1>
        <p className="text-sm text-muted">Customer Service chat from the Consulting page. Customers see every reply as Anargya Team. Automatic messages and the topic the customer picked are shown here too. Times in JST.{unread ? ` ${unread} waiting for a reply.` : ""}</p>
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
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{current.name || current.email || "Customer"}</p>
                  {current.email && <a href={`mailto:${current.email}`} className="truncate text-xs text-teal hover:underline">{current.email}</a>}
                </div>
                {canDelete && (
                  <button type="button" className="btn btn-outline min-h-9 shrink-0 px-3 text-[13px] text-oxide" aria-expanded={confirmDel} onClick={() => setConfirmDel((v) => !v)}><Trash2 size={16} aria-hidden />Delete history</button>
                )}
              </header>
              {confirmDel && (
                <div role="alertdialog" aria-label="Delete history" className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-oxide-tint px-4 py-3 text-sm">
                  <p>Delete this whole conversation for the customer and the team? This cannot be undone.</p>
                  <span className="flex gap-2">
                    <button type="button" className="btn btn-outline min-h-8 px-3 text-[13px]" onClick={() => setConfirmDel(false)}>Cancel</button>
                    <button type="button" className="btn min-h-8 bg-oxide px-3 text-[13px] text-white hover:bg-oxide/90" disabled={busy} onClick={deleteHistory}><Trash2 size={14} aria-hidden />Delete</button>
                  </span>
                </div>
              )}
              <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-surface p-4" aria-live="polite">
                {/* greeting the customer sees when the chat opens (not stored) */}
                <Row mine={false} label="Auto-reply · greeting" auto>{GREETING}</Row>
                {msgs.map((m, i) => {
                  // marker where the customer pressed "Start over" (they no longer see what is above it)
                  const reset = resetAt && m.at > resetAt && (i === 0 || msgs[i - 1].at <= resetAt) ? <ResetMark at={resetAt} /> : null;
                  const label = `${m.sender === "staff" ? (m.kind === "auto" ? "Auto-reply" : m.staffName ?? "Staff") : "Customer"} · ${when(m.at)}`;
                  if (m.kind === "product" && m.product) return (
                    <Fragment key={m.id}>{reset}<Row mine label={label}>
                      <span className="flex items-center gap-3">
                        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white" aria-hidden>{m.product.image ? <img src={m.product.image} alt="" className="h-full w-full object-contain" /> : <Package size={20} className="text-muted" />}</span>
                        <span className="flex flex-col"><span className="font-medium">{m.product.name}</span><span className="font-mono text-xs opacity-80">{usd(m.product.priceUsd)} · product card</span></span>
                      </span>
                    </Row></Fragment>
                  );
                  return (
                    <Fragment key={m.id}>{reset}<Row mine={m.sender === "staff" && m.kind !== "auto"} label={label} auto={m.kind === "auto"}
                      tag={m.kind === "topic" ? `Topic chosen: ${topicName(m.topic)}` : m.kind === "auto" ? `Points to booking: ${topicName(m.topic)}` : undefined}>
                      {m.body}
                    </Row></Fragment>
                  );
                })}
                {resetAt && msgs.every((m) => m.at <= resetAt) && <ResetMark at={resetAt} />}
              </div>
              {err && <p role="alert" className="border-t border-line bg-oxide-tint px-4 py-2 text-[13px] text-oxide">{err}</p>}
              {picker && (
                <div className="max-h-56 overflow-y-auto border-t border-line bg-white" role="listbox" aria-label="Send a product card">
                  {products === null && <p className="px-4 py-3 text-sm text-muted">Loading products…</p>}
                  {products?.length === 0 && <p className="px-4 py-3 text-sm text-muted">No active products.</p>}
                  {products?.map((p) => (
                    <button key={p.slug} type="button" role="option" aria-selected={false} disabled={busy} onClick={() => sendProduct(p.slug)}
                      className="flex w-full items-center gap-3 border-b border-line px-4 py-2 text-left hover:bg-surface">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface" aria-hidden>{p.image ? <img src={p.image} alt="" className="h-full w-full object-contain" /> : <Package size={18} className="text-muted" />}</span>
                      <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium">{p.name}</span><span className="font-mono text-xs text-muted">{p.code} · stock {p.stock}</span></span>
                      <span className="font-mono text-sm">{usd(p.priceUsd)}</span>
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={reply} className="flex items-end gap-2 border-t border-line p-3">
                <button type="button" onClick={openPicker} aria-expanded={picker} className={`btn btn-outline size-12 shrink-0 p-0 ${picker ? "border-teal text-teal" : ""}`} aria-label="Send a product card" title="Send a product card"><Package size={18} aria-hidden /></button>
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

function Row({ mine, label, auto, tag, children }: { mine: boolean; label: string; auto?: boolean; tag?: string; children: React.ReactNode }) {
  return (
    <div className={`flex max-w-[80%] flex-col gap-1 ${mine ? "self-end items-end" : "self-start items-start"}`}>
      <span className="flex items-center gap-1 text-xs text-muted">{auto && <Bot size={12} aria-hidden />}{label}</span>
      {tag && <span className="flex items-center gap-1 rounded-full bg-ochre-tint px-2 py-0.5 text-[11px] font-medium"><Tag size={11} aria-hidden />{tag}</span>}
      <div className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] ${mine ? "rounded-br-md bg-teal text-white" : auto ? "rounded-bl-md border border-dashed border-line bg-white text-muted" : "rounded-bl-md border border-line bg-white"}`}>{children}</div>
    </div>
  );
}

/** Divider where the customer pressed "Start over": they no longer see the messages above it. */
function ResetMark({ at }: { at: string }) {
  return <p className="flex items-center gap-2 self-stretch text-xs text-muted"><span className="h-px flex-1 bg-line" /><RotateCcw size={12} aria-hidden />Customer started over · {when(at)}<span className="h-px flex-1 bg-line" /></p>;
}
