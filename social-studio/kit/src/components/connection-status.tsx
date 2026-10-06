import type { ConnectionState } from "@/lib/analytics";
import { PLATFORM } from "./ui";
import type { Platform } from "@/lib/db";

const STATE: Record<ConnectionState, { label: string; cls: string }> = {
  CONNECTED: { label: "Conectada", cls: "bg-accent-soft text-accent" },
  SYNCING: { label: "Sincronizando…", cls: "bg-accent-soft text-accent" },
  SYNCED: { label: "Al día", cls: "bg-ok-soft text-ok" },
  NEEDS_REAUTHORIZATION: { label: "Reconectar", cls: "bg-bad-soft text-bad" },
  RATE_LIMITED: { label: "En pausa", cls: "bg-warn-soft text-warn" },
  ERROR: { label: "Error", cls: "bg-bad-soft text-bad" },
  DISCONNECTED: { label: "Desconectada", cls: "bg-surface-2 text-muted" },
};

export function ConnectionPill({ state }: { state: ConnectionState }) {
  const s = STATE[state];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

/** Hace cuánto (en español, sin depender de la zona horaria del navegador). */
export function ago(ms: number | null) {
  if (!ms) return null;
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

/** Texto de ayuda de cada estado (lo que ve un usuario normal, sin jerga técnica). */
export function connectionHelp(state: ConnectionState, platform: Platform, lastSyncedAt: number | null, rateLimitedUntil: number | null) {
  const red = PLATFORM[platform].label;
  switch (state) {
    case "CONNECTED":
      return "Conectada. Las métricas se cargarán en unos minutos.";
    case "SYNCING":
      return "Estamos trayendo tus publicaciones y métricas.";
    case "SYNCED":
      return `Última actualización: ${ago(lastSyncedAt)}.`;
    case "NEEDS_REAUTHORIZATION":
      return `${red} ha cerrado el acceso (caducó o cambiaste la contraseña). No podemos publicar ni leer métricas hasta que vuelvas a conectarla.`;
    case "RATE_LIMITED":
      return `${red} nos pide esperar un poco. Lo reintentaremos solos${rateLimitedUntil ? ` en unos ${Math.max(1, Math.round((rateLimitedUntil - Date.now()) / 60_000))} min` : ""}.`;
    case "ERROR":
      return "No pudimos sincronizar. Si se repite, vuelve a conectar la cuenta.";
    case "DISCONNECTED":
      return "Ya no publicamos en esta cuenta. Tu historial se conserva.";
  }
}
