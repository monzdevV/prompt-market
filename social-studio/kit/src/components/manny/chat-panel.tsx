"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { api } from "@/lib/client-api";
import { CopyButton } from "./copy-button";

export type ChatMessage = { id: number | string; role: "user" | "manny"; content: string };

const SUGGESTIONS = ["¿Qué grabo hoy?", "Revisa mis últimas métricas", "Dame 3 ganchos para un vídeo de espalda", "¿A qué hora publico mañana?"];

/** **negrita** dentro de una línea, sin HTML: todo lo demás se pinta como texto. */
function inline(text: string) {
  return text.split(/\*\*([^*]+)\*\*/g).map((t, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold">
        {t}
      </strong>
    ) : (
      t
    ),
  );
}

/** Markdown mínimo y seguro: párrafos, listas con - o 1., y negrita. */
function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={blocks.length} className="text-pretty">
          {para.flatMap((l, i) => (i ? [<br key={`b${i}`} />, ...inline(l)] : inline(l)))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={`grid gap-1 pl-5 marker:text-faint ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((it, i) => (
          <li key={i} className="pl-1 text-pretty">
            {inline(it)}
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (bullet || num) {
      flushPara();
      const ordered = !!num;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? num)![1]);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else if (heading) {
      flushPara();
      flushList();
      blocks.push(
        <p key={blocks.length} className="font-semibold text-balance">
          {inline(heading[1])}
        </p>,
      );
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <div className="grid gap-2.5 text-[15px] leading-relaxed">{blocks}</div>;
}

export function ChatPanel({ initial }: { initial: ChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const tempSeq = useRef(0);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // Sigue al último mensaje solo si ya estabas abajo (o acabas de escribir)
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages, busy, error]);

  function onScroll() {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    stick.current = true;
    setError(null);
    setFailed(null);
    setBusy(true);
    setSecs(0);
    const tempId = `tmp-${++tempSeq.current}`;
    setMessages((m) => [...m, { id: tempId, role: "user", content }]);
    setDraft("");
    try {
      const { user, reply } = await api<{ user: ChatMessage; reply: ChatMessage }>("/api/manny/chat", { body: { message: content } });
      setMessages((m) => [...m.filter((x) => x.id !== tempId), user, reply]);
    } catch (e) {
      // La pregunta queda guardada en el servidor aunque Manny falle; aquí se quita para poder reintentar sin duplicarla
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setDraft(content);
      setFailed(content);
      setError(e instanceof Error ? e.message : "Manny no ha podido contestar");
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  async function clear() {
    try {
      await api("/api/manny/chat", { method: "DELETE" });
      setMessages([]);
      setError(null);
      setFailed(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  return (
    <div className="card flex h-[calc(100dvh-15rem)] min-h-[30rem] flex-col overflow-hidden">
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-6" role="log" aria-live="polite" aria-label="Conversación con Manny">
        {messages.length === 0 && !busy ? (
          <div className="mx-auto flex h-full max-w-lg flex-col justify-center">
            <p className="display text-3xl text-balance">¿Qué necesitas hoy?</p>
            <p className="mt-2 text-sm text-pretty text-muted">Conozco tu perfil, tus métricas, tus guiones y lo que está funcionando en tu radar. Pregúntame lo que harías con un mánager.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="btn-ghost">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mx-auto grid max-w-3xl gap-5">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-3 px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-pretty">{m.content}</p>
                ) : (
                  <div className="max-w-[92%]">
                    <p className="mb-1.5 text-xs font-medium text-accent">Manny</p>
                    <Markdown text={m.content} />
                    <div className="mt-2">
                      <CopyButton text={m.content} label="Copiar" className="btn-ghost btn-sm" />
                    </div>
                  </div>
                )}
              </li>
            ))}
            {busy && (
              <li role="status" className="flex items-center gap-2 text-sm text-muted">
                <LoaderCircle size={14} aria-hidden className="animate-spin text-accent" />
                Manny está pensando…
                <span className="font-mono text-xs tabular-nums">{secs} s</span>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="border-t border-line bg-bg-2/60 p-3 md:p-4">
        {error && (
          <p role="alert" className="mx-auto mb-3 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-bad/40 bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
            <span className="min-w-0 flex-1 text-pretty">{error}</span>
            {failed && (
              <button type="button" onClick={() => send(failed)} disabled={busy} className="inline-flex items-center gap-1.5 underline underline-offset-4">
                <RotateCcw size={13} aria-hidden /> Reintentar
              </button>
            )}
          </p>
        )}
        <form
          className="mx-auto flex max-w-3xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Mensaje para Manny
          </label>
          <textarea
            id="chat-input"
            ref={input}
            rows={1}
            value={draft}
            maxLength={4000}
            disabled={busy}
            placeholder="Escribe a Manny…"
            onChange={(e) => {
              setDraft(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
            }}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={() => (composing.current = false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !composing.current && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
            className="input max-h-40 min-h-11 resize-none"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="btn-primary h-11 w-11 shrink-0 px-0" aria-label="Enviar">
            <ArrowUp size={17} aria-hidden />
          </button>
        </form>
        <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between gap-3">
          <p className="hint">Intro envía · Mayús+Intro salto de línea</p>
          {messages.length > 0 && (
            <ConfirmButton onConfirm={clear} confirmLabel="¿Borrar todo? Pulsa otra vez" disabled={busy}>
              Borrar conversación
            </ConfirmButton>
          )}
        </div>
      </div>
    </div>
  );
}
