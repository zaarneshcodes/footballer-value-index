"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ReactionCard } from "@/components/ReactionCard";
import { ScoutAvatar } from "@/components/ScoutAvatar";
import type { Card } from "@/lib/scout-sop";

type Msg = { role: "user" | "assistant"; text: string; card?: Card; error?: boolean };

const SUGGESTIONS = [
  "Who are the 5 most valuable players in LaLiga?",
  "Which defenders under 23 have the biggest expected rise?",
  "How has Bukayo Saka's value changed over time?",
  "Who scored the most goals in the Premier League last season?",
];

// Tiny, safe formatter for the replies: **bold**, *italic*, "- " / "1. " lists and links
// to player pages only. No HTML from the model is ever rendered.
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((\/players\/\d+)\)|\*([^*\s][^*]*)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${m.index}`;
    if (m[1]) out.push(<strong key={k} className="font-semibold">{inline(m[1], k)}</strong>);
    else if (m[4]) out.push(<em key={k}>{inline(m[4], k)}</em>);
    else
      out.push(
        <Link key={k} href={m[3]} className="font-semibold text-pitch underline underline-offset-2">
          {m[2]}
        </Link>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Formatted({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={blocks.length}
        className={`flex flex-col gap-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-muted`}
      >
        {list.items.map((it, i) => (
          <li key={i}>{inline(it, `${blocks.length}-${i}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const item = /^(?:([-*])|(\d+)\.)\s+(.*)$/.exec(line);
    if (item) {
      const ordered = Boolean(item[2]);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push(item[3]);
      continue;
    }
    // Indented sub-lines (e.g. "   - estimate ...") join the previous list item.
    if (list && raw.startsWith("  ") && line) {
      list.items[list.items.length - 1] += ` · ${line.replace(/^[-*]\s+/, "")}`;
      continue;
    }
    flush();
    if (line) blocks.push(<p key={blocks.length}>{inline(line, String(blocks.length))}</p>);
  }
  flush();
  return <div className="flex flex-col gap-2">{blocks}</div>;
}

export function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, busy]);

  async function send(text: string) {
    const q = text.trim().slice(0, 500);
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Failed replies aren't sent back as history.
        // Cards go back as tags so The Scout remembers which ones it already showed.
        body: JSON.stringify({
          messages: next
            .filter((m) => !m.error)
            .map(({ role, text, card }) => ({ role, text: card ? `[card:${card}] ${text}` : text })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [
        ...m,
        data.reply
          ? { role: "assistant", text: data.reply, card: data.card }
          : { role: "assistant", text: data.error ?? "Something went wrong. Please try again.", error: true },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach the server. Please try again.", error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <ScoutAvatar className="h-20 w-20 shrink-0" thinking={busy} />
        <div>
          <p className="font-display text-2xl font-bold text-pitch">The Scout</p>
          <p className="text-sm text-muted">Knows only what&apos;s in this site&apos;s database.</p>
        </div>
      </div>
      {messages.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="press rounded-full border-2 border-rule bg-sheet px-4 py-2 text-left text-sm font-medium hover:border-pitch"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-4" aria-live="polite">
          {messages.map((m, i) => (
            <li key={i} className={`chat-in flex items-end gap-2 ${m.role === "user" ? "self-end" : "self-start"}`}>
              {m.role === "assistant" && <ScoutAvatar className="h-9 w-9 shrink-0 max-sm:hidden" />}
              <div
              className={`max-w-[min(42rem,92vw)] rounded-xl px-4 py-3 leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-pitch font-medium text-chalk"
                  : m.error
                    ? "rounded-bl-sm border-2 border-[var(--down)]/50 bg-sheet text-ink"
                    : "rounded-bl-sm border border-rule border-l-4 border-l-pitch bg-sheet text-ink"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "You:" : "The Scout:"}</span>
              {m.card && (
                <div className="mb-3">
                  <ReactionCard card={m.card} />
                </div>
              )}
              {m.role === "user" ? m.text : <Formatted text={m.text} />}
              </div>
            </li>
          ))}
          {busy && (
            <li className="chat-in flex items-center gap-2 self-start text-sm text-muted">
              <span className="chat-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              The Scout is checking the database…
            </li>
          )}
        </ol>
      )}
      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-3 flex items-end gap-2 rounded-xl border-2 border-rule bg-sheet p-2 shadow-sm focus-within:border-pitch"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask about a player
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          maxLength={500}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about a player, a league or a position…"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-ink outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="press h-11 shrink-0 rounded-lg bg-pitch px-5 font-semibold text-chalk hover:opacity-90 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
