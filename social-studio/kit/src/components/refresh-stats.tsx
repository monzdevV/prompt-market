"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

export function RefreshStats() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className="btn-ghost btn-sm"
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api<{ queued: number }>("/api/stats", { method: "POST" });
          toast.success(r.queued ? "Sincronizando tus redes: los datos se actualizarán en unos minutos" : "No hay redes conectadas que sincronizar");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudieron actualizar");
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw size={12} className={busy ? "animate-spin" : ""} aria-hidden /> {busy ? "Actualizando…" : "Actualizar"}
    </button>
  );
}
