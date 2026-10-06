"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

/** Guarda en el banco de ideas lo que has visto (un vídeo del radar, un resultado de búsqueda, un consejo de Manny). */
export function SaveIdeaButton({ titulo, angulo, basadoEn, label = "Guardar idea" }: { titulo: string; angulo?: string; basadoEn?: string; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  async function save() {
    setState("saving");
    try {
      await api("/api/manny/ideas/add", { body: { titulo: titulo.slice(0, 120), angulo: angulo?.slice(0, 400), basadoEn: basadoEn?.slice(0, 200) } });
      setState("saved");
      toast.success("Guardada en Ideas");
      router.refresh();
    } catch (e) {
      setState("idle");
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }
  return (
    <button type="button" onClick={save} disabled={state !== "idle"} className="btn-ghost btn-sm">
      {state === "saving" ? <LoaderCircle size={13} aria-hidden className="animate-spin" /> : state === "saved" ? <BookmarkCheck size={13} aria-hidden className="text-ok" /> : <Bookmark size={13} aria-hidden />}
      {state === "saved" ? "Guardada" : label}
    </button>
  );
}

/** Manny lee el radar y escribe sus conclusiones. */
export function AnalyzeRadarButton({ hasAnalysis, disabledReason }: { hasAnalysis: boolean; disabledReason: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await api("/api/manny/radar/analyze", { method: "POST" });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo analizar");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button type="button" onClick={run} disabled={busy || !!disabledReason} className={hasAnalysis ? "btn-ghost btn-sm" : "btn-primary btn-sm"}>
        {busy ? <LoaderCircle size={13} aria-hidden className="animate-spin" /> : <Sparkles size={13} aria-hidden />}
        {busy ? "Leyendo los datos… (1–2 min)" : hasAnalysis ? "Volver a analizar" : "Que Manny lo analice"}
      </button>
      {disabledReason && <p className="hint mt-2 max-w-sm">{disabledReason}</p>}
    </div>
  );
}
