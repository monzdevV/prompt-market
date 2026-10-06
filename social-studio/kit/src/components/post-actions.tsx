"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { ConfirmButton } from "./confirm-button";

/** Botones de una publicación: publicar ya, reintentar, actualizar métricas y borrar. */
export function PostActions({ id, status, hasFailed }: { id: number; status: string; hasFailed: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const busy = running !== null;

  async function run(action: string, label: string, fn: () => Promise<unknown>, ok: string) {
    setRunning(action);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error(`${label}: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setRunning(null);
    }
  }

  const act = (action: string) => api(`/api/posts/${id}`, { body: { action } });

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "scheduled" && (
        <button disabled={busy} onClick={() => run("publish-now", "No se pudo publicar", () => act("publish-now"), "Publicando ahora")} className="btn-ghost btn-sm">
          <Send size={12} aria-hidden /> Publicar ya
        </button>
      )}
      {hasFailed && status !== "publishing" && (
        <button disabled={busy} onClick={() => run("retry", "No se pudo reintentar", () => act("retry"), "Reintentando las redes con error")} className="btn-ghost btn-sm">
          <RefreshCw size={12} aria-hidden /> Reintentar las que fallaron
        </button>
      )}
      {(status === "done" || status === "partial") && (
        <button disabled={busy} onClick={() => run("stats", "No se pudieron actualizar", () => act("stats"), "Métricas actualizadas")} className="btn-ghost btn-sm">
          {running === "stats" ? "Actualizando…" : "Actualizar métricas"}
        </button>
      )}
      {status !== "publishing" && (
        <ConfirmButton disabled={busy} onConfirm={() => run("delete", "No se pudo borrar", () => api(`/api/posts/${id}`, { method: "DELETE" }), "Publicación borrada de la app")}>
          Borrar de la app
        </ConfirmButton>
      )}
    </div>
  );
}

/** Un destino con resultado dudoso: el usuario comprueba en la red y nos dice qué pasó. */
export function TargetReview({ targetId }: { targetId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  async function resolve(outcome: "published" | "not_published") {
    setBusy(true);
    try {
      await api(`/api/targets/${targetId}/review`, { body: { outcome, url: outcome === "published" && url ? url : undefined } });
      toast.success(outcome === "published" ? "Marcada como publicada" : "Marcada como no publicada: ya puedes reintentarla");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-warn/40 bg-warn-soft/50 p-2.5 text-xs">
      <p className="mb-2">Mira en la red si el vídeo salió. Así evitamos publicarlo dos veces. Si no salió, podrás reintentarlo.</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="url"
          inputMode="url"
          pattern="https://.*"
          title="Un enlace que empiece por https://"
          className="input h-7 max-w-64 px-2 py-0 text-xs"
          placeholder="https://… (opcional)"
          aria-label="Enlace a la publicación"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button disabled={busy} className="btn-ghost btn-sm" onClick={() => resolve("published")}>
          Sí se publicó
        </button>
        <button disabled={busy} className="btn-ghost btn-sm" onClick={() => resolve("not_published")}>
          No se publicó
        </button>
      </div>
    </div>
  );
}
