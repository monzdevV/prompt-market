"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { ConfirmButton } from "./confirm-button";

export function SyncAccountButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="btn-ghost btn-sm"
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/accounts/${id}/sync`, { method: "POST" });
          toast.success("Sincronizando: los datos aparecerán en unos minutos");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo sincronizar");
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw size={12} className={busy ? "animate-spin" : ""} aria-hidden /> Sincronizar
    </button>
  );
}

export function DisconnectButton({ id, name, scheduled }: { id: number; name: string; scheduled: number }) {
  const router = useRouter();
  return (
    <ConfirmButton
      className="btn-danger btn-sm"
      confirmLabel={scheduled ? `Se cancelarán ${scheduled} programadas. ¿Seguro?` : "¿Desconectar?"}
      onConfirm={async () => {
        try {
          const r = (await api(`/api/accounts/${id}`, { method: "DELETE" })) as { revoked?: boolean } | undefined;
          // Solo decimos que se retiró el acceso en la red si de verdad se hizo (Meta no lo permite desde aquí)
          toast.success(
            r?.revoked
              ? `${name} desconectada. Hemos retirado el acceso de la app en la red.`
              : `${name} desconectada y sus claves borradas. Para quitar también el permiso en la red, hazlo desde su configuración de apps.`,
          );
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo desconectar");
        }
      }}
    >
      Desconectar
    </ConfirmButton>
  );
}
