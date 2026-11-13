"use client";
/* eslint-disable @next/next/no-img-element -- product card snapshots may point to Supabase Storage; small thumbs, no optimiser needed */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Headset, Minus, Package, Send, X } from "lucide-react";
import { useAuth } from "@/components/auth-state";
import { Price } from "@/components/price";
import { useLocale, useLp, useT } from "@/i18n/client";
import { TOPICS, type TopicId } from "@/lib/booking";
import { AUTO_BOOK, AUTO_REPLY, BOOK_TOPIC, GREETING, OPEN_CHAT, TOPIC_ASK, type ChatMessage, type ProductCard } from "@/lib/support-topics";

const POLL_MS = 4000;

/** Teal card above the booking calendar. Opens a floating chat with the team (bottom right).
 *  The headset button in the calendar opens the same chat through the OPEN_CHAT window event. */
export function SupportChat() {
  const t = useT();
  const L = useLp();
  const router = useRouter();
  const { ready, signedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const loginHref = L(`/login?next=${encodeURIComponent(L("/consulting"))}`);

  useEffect(() => {
    const onOpen = () => { if (!ready) return; if (signedIn) setOpen(true); else router.push(loginHref); };
    addEventListener(OPEN_CHAT, onOpen);
    return () => removeEventListener(OPEN_CHAT, onOpen);
  }, [ready, signedIn, loginHref, router]);

  return (
    <>
      <section aria-labelledby="chat-title" className="flex flex-col gap-4 rounded-xl bg-teal p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15"><Headset size={20} aria-hidden /></span>
          <div className="flex flex-col gap-1">
            <h2 id="chat-title" className="font-semibold">{t("Chat with our Customer Service")}</h2>
            <p className="text-sm text-white/85">{t("Questions before you book? Message our team. We usually reply within one business day (JST).")}</p>
          </div>
        </div>
        {ready && !signedIn ? (
          <Link href={loginHref} className="btn shrink-0 bg-white text-teal hover:bg-white/90">{t("Log in to chat")}<ArrowRight size={16} aria-hidden /></Link>
        ) : (
          <button type="button" className="btn shrink-0 bg-white text-teal hover:bg-white/90" aria-expanded={open} aria-controls="support-chat" onClick={() => setOpen(true)} disabled={!ready}>
            {t("Start chat")}<ArrowRight size={16} aria-hidden />
          </button>
        )}
      </section>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const L = useLp();
  const locale = useLocale();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<TopicId | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [min, setMin] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const time = (iso: string) => new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  // Poll while open: staff replies appear within a few seconds.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/support", { cache: "no-store" })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => { if (!alive) return; setLoaded(true); if (ok) setMsgs(d.messages ?? []); else setErr(d.error ?? "Chat is not available right now."); })
        .catch(() => {});
    load();
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs.length, min, loaded]);
  useEffect(() => { if (!min) inputRef.current?.focus({ preventScroll: true }); }, [min]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  // Topic chips: only before the customer's first message. Tapping one fills the message box.
  const showTopics = loaded && !msgs.some((m) => m.sender === "customer");
  function pick(id: TopicId) {
    const label = TOPICS.find((x) => x.id === id)!.label;
    setText(t(TOPIC_ASK, { topic: t(label) }));
    setTopic(id);
    inputRef.current?.focus();
  }

  function book(id: TopicId | null) {
    dispatchEvent(new CustomEvent(BOOK_TOPIC, { detail: id }));
    setMin(true);
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr("");
    const res = await fetch("/api/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, topic }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setErr(d?.error ?? "Could not send. Try again.");
    setText(""); setTopic(null);
    setMsgs((m) => [...m, ...(d.messages ?? [])]);
  }

  return (
    <div id="support-chat" role="dialog" aria-label={t("Customer Service chat")}
      className="fixed inset-x-3 bottom-3 z-[1100] flex max-h-[min(600px,calc(100svh-96px))] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]">
      <header className="flex items-center justify-between gap-2 bg-teal px-4 py-3 text-white">
        <p className="flex items-center gap-2 font-semibold"><Headset size={18} aria-hidden />{t("Anargya Customer Service")}</p>
        <div className="flex gap-1">
          <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-white/15" aria-label={t(min ? "Expand chat" : "Minimize chat")} aria-expanded={!min} onClick={() => setMin((v) => !v)}><Minus size={16} aria-hidden /></button>
          <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-white/15" aria-label={t("Close chat")} onClick={onClose}><X size={16} aria-hidden /></button>
        </div>
      </header>
      {!min && (
        <>
          <div ref={listRef} className="flex min-h-[240px] flex-1 flex-col gap-3 overflow-y-auto bg-surface p-4" aria-live="polite">
            {/* auto greeting (not stored) */}
            <Bubble mine={false} who={t("Anargya Team")} auto>{t(GREETING)}</Bubble>
            {showTopics && (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("Choose a topic")}>
                {TOPICS.map((o) => (
                  <button key={o.id} type="button" onClick={() => pick(o.id)} aria-pressed={topic === o.id}
                    className={`rounded-full border px-3 py-1.5 text-left text-[13px] ${topic === o.id ? "border-teal bg-teal-tint text-teal" : "border-line bg-white hover:border-teal"}`}>
                    {t(o.label)}
                  </button>
                ))}
              </div>
            )}
            <p className="text-center text-xs text-muted">{t("We usually reply within one business day (JST). You can close this window; replies stay here.")}</p>
            {msgs.map((m) => {
              const who = m.sender === "staff" ? t("Anargya Team") : null;
              if (m.kind === "product" && m.product) return <ProductBubble key={m.id} who={who!} at={time(m.at)} p={m.product} href={L(`/marketplace/${m.product.slug}`)} />;
              if (m.kind === "auto") return (
                <Bubble key={m.id} mine={false} who={who} at={time(m.at)} auto>
                  {m.topic ? `${t(AUTO_REPLY[m.topic])} ${t(AUTO_BOOK)}` : m.body}
                  <button type="button" onClick={() => book(m.topic)} className="btn btn-teal mt-2 min-h-9 w-full text-[13px]"><CalendarDays size={16} aria-hidden />{t("Book a consultation")}</button>
                </Bubble>
              );
              return <Bubble key={m.id} mine={m.sender === "customer"} who={who} at={time(m.at)}>{m.body}</Bubble>;
            })}
          </div>
          {err && <p role="alert" className="border-t border-line bg-oxide-tint px-4 py-2 text-[13px] text-oxide">{t(err)}</p>}
          <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
            <label htmlFor="chat-input" className="sr-only">{t("Message")}</label>
            <textarea id="chat-input" ref={inputRef} rows={1} maxLength={2000} value={text} onChange={(e) => { setText(e.target.value); if (!e.target.value.trim()) setTopic(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              placeholder={t("Type a message…")} className="input max-h-32 min-h-10 flex-1 resize-none py-2" />
            <button type="submit" className="btn btn-teal size-10 shrink-0 p-0" disabled={busy || !text.trim()} aria-label={t("Send")}><Send size={16} aria-hidden /></button>
          </form>
        </>
      )}
    </div>
  );
}

function Bubble({ mine, who, at, auto, children }: { mine: boolean; who?: string | null; at?: string; auto?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className={`flex max-w-[85%] flex-col gap-1 ${mine ? "self-end items-end" : "self-start items-start"}`}>
      {who && <span className="text-xs text-muted">{who}</span>}
      <div className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] ${mine ? "rounded-br-md bg-teal text-white" : "rounded-bl-md border border-line bg-white"}`}>{children}</div>
      {(at || auto) && <span className="flex gap-2 text-[10px] text-muted">{auto && <span>{t("Auto-reply")}</span>}{at && <span className="font-mono">{at}</span>}</span>}
    </div>
  );
}

/** Product card sent by the team: photo, name, price and a link to the product page. */
function ProductBubble({ who, at, p, href }: { who: string; at: string; p: ProductCard; href: string }) {
  const t = useT();
  return (
    <div className="flex w-[85%] flex-col gap-1 self-start">
      <span className="text-xs text-muted">{who}</span>
      <div className="flex flex-col gap-3 rounded-2xl rounded-bl-md border border-line bg-white p-3">
        <div className="flex gap-3">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface" aria-hidden>
            {p.image ? <img src={p.image} alt="" className="h-full w-full object-contain" /> : <Package size={24} className="text-muted" />}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="line-clamp-2 text-sm font-semibold">{p.name}</span>
            <Price usd={p.priceUsd} className="text-sm font-medium text-teal" />
          </span>
        </div>
        <Link href={href} className="btn btn-teal min-h-9 w-full text-[13px]">{t("View product")}<ArrowRight size={16} aria-hidden /></Link>
      </div>
      <span className="font-mono text-[10px] text-muted">{at}</span>
    </div>
  );
}
