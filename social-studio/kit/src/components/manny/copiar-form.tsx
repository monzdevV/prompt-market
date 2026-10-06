"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, ClipboardPaste, LoaderCircle, Wand2 } from "lucide-react";
import { api } from "@/lib/client-api";

const URL_OK = /^https?:\/\/\S+$/i;

/** Pegar un enlace → leer, transcribir y escribir las versiones. Tarda: se muestra cuánto lleva, sin inventar fases. */
export function CopiarForm({ initialUrl = "", autoStart = false }: { initialUrl?: string; autoStart?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [transcribe, setTranscribe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const started = useRef(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function run(over?: { url?: string }) {
    const u = (over?.url ?? url).trim();
    if (busy || (!URL_OK.test(u) && !text.trim())) return;
    setBusy(true);
    setSecs(0);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/manny/remix", { body: { url: URL_OK.test(u) ? u : "", text, note, transcribe } });
      router.push(`/manny/copiar/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No he podido analizarlo");
      setBusy(false);
    }
  }

  useEffect(() => {
    // Viene de «Pásame un TikTok»: arranca solo, una vez
    if (autoStart && !started.current && URL_OK.test(initialUrl.trim())) {
      started.current = true;
      void run({ url: initialUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  async function paste() {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) setUrl(t);
    } catch {
      // El navegador no ha dejado leer el portapapeles: se pega a mano
    }
  }

  const canSend = URL_OK.test(url.trim()) || text.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
      aria-busy={busy}
    >
      <label htmlFor="copiar-url" className="label">
        Enlace del vídeo
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            id="copiar-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@usuario/video/…"
            className="input h-12 pr-24 text-[15px]"
          />
          <button type="button" onClick={paste} disabled={busy} className="btn-ghost btn-sm absolute top-1/2 right-2 -translate-y-1/2">
            <ClipboardPaste size={13} aria-hidden /> Pegar
          </button>
        </div>
        <button type="submit" disabled={busy || !canSend} className="btn-primary h-12 px-6">
          {busy ? (
            <>
              <LoaderCircle size={16} aria-hidden className="animate-spin" /> Trabajando…
            </>
          ) : (
            <>
              <Wand2 size={16} aria-hidden /> Dame mis versiones
            </>
          )}
        </button>
      </div>
      <p className="hint mt-2">Vale un TikTok (vídeo o carrusel) o un Short de YouTube. Solo leo lo que es público.</p>

      <details className="mt-5 group" open={optionsOpen} onToggle={(e) => setOptionsOpen(e.currentTarget.open)}>
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted transition-colors select-none hover:text-fg [&::-webkit-details-marker]:hidden">
          <ChevronRight size={14} aria-hidden className="transition-transform duration-200 group-open:rotate-90" /> Más opciones
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="copiar-note" className="label">
              ¿Algo que quieras cambiar?
            </label>
            <input id="copiar-note" disabled={busy} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Por ejemplo: lo grabaría con un colega" className="input" />
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" disabled={busy} checked={transcribe} onChange={(e) => setTranscribe(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span>
                Escuchar lo que dice el vídeo
                <span className="hint block">Suma 20–30 s, pero las versiones salen mucho mejor.</span>
              </span>
            </label>
          </div>
          <div>
            <label htmlFor="copiar-text" className="label">
              Si el enlace no se lee, pega aquí lo que dice o su descripción
            </label>
            <textarea id="copiar-text" disabled={busy} value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={4000} className="input resize-y" placeholder="Pega la descripción, el texto en pantalla o lo que se dice" />
          </div>
        </div>
      </details>

      {busy && (
        <div role="status" className="mt-6 rounded-xl border border-line bg-surface-2/60 p-4">
          <p className="text-sm">
            <span className="font-medium">Leyendo el vídeo{transcribe ? ", escuchándolo" : ""} y escribiendo tus versiones.</span> Suele tardar entre 40 y 90 segundos.
          </p>
          <p className="mt-1 font-mono text-xs text-muted tabular-nums">Llevo {secs} s · no cierres esta pestaña</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div className="h-full w-1/3 animate-[slide_1.4s_ease-in-out_infinite] rounded-full bg-accent/70" />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-bad/40 bg-bad-soft p-4 text-sm text-bad text-pretty">
          {error}
          {!text.trim() && (
            <button type="button" className="ml-2 underline underline-offset-4" onClick={() => setOptionsOpen(true)}>
              Pegar el texto a mano
            </button>
          )}
        </p>
      )}
    </form>
  );
}
