import { db } from "./db";
import { ApiError } from "./errors";

/**
 * Planes y límites. Los PRECIOS no están aquí (se definirán en Stripe); solo lo que incluye cada plan.
 * Los límites se aplican en el servidor: la interfaz solo los muestra.
 */
export type PlanKey = "free" | "pro" | "business";

/** Sin límite (p. ej. vídeos al mes: se paga la IA, no el número de vídeos) */
export const UNLIMITED = Number.POSITIVE_INFINITY;

export type Limits = {
  brands: number;
  socialAccounts: number;
  videosPerMonth: number;
  aiGenerationsPerMonth: number;
  historyDays: number;
  teamMembers: number;
  storageMb: number;
};

/**
 * Todo lo que no es IA es igual en los tres planes (el plan gratis puede hacer de todo menos usar la IA).
 * Lo único que se paga es la IA: transcripción + título, descripción y hashtags.
 */
const EVERYTHING: Omit<Limits, "aiGenerationsPerMonth"> = {
  brands: 10,
  socialAccounts: 50,
  videosPerMonth: UNLIMITED,
  historyDays: 730,
  teamMembers: 10,
  storageMb: 102400,
};

export const PLANS: Record<PlanKey, { name: string; tagline: string; limits: Limits }> = {
  free: {
    name: "Free",
    tagline: "Todo incluido menos la IA: el texto lo escribes tú",
    limits: { ...EVERYTHING, aiGenerationsPerMonth: 0 },
  },
  pro: {
    name: "Pro",
    tagline: "Todo lo de Free y la IA escribe por ti",
    limits: { ...EVERYTHING, aiGenerationsPerMonth: 200 },
  },
  business: {
    name: "Business",
    tagline: "Para agencias y equipos que publican a diario",
    limits: { ...EVERYTHING, aiGenerationsPerMonth: 1000 },
  },
};

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "free" || v === "pro" || v === "business";
}

export function workspacePlan(workspaceId: string): PlanKey {
  const row = db.prepare("SELECT plan FROM workspaces WHERE id = ?").get(workspaceId) as { plan: string } | undefined;
  return isPlanKey(row?.plan) ? row!.plan : "free";
}

export function limitsFor(workspaceId: string): Limits {
  return PLANS[workspacePlan(workspaceId)].limits;
}

function monthUsage(workspaceId: string, metric: string) {
  const period = new Date().toISOString().slice(0, 7);
  return (
    (db.prepare("SELECT value FROM usage WHERE workspace_id = ? AND period = ? AND metric = ?").get(workspaceId, period, metric) as
      | { value: number }
      | undefined)?.value ?? 0
  );
}

/** Uso actual frente a los límites (para la pantalla de Plan). */
export function usageSummary(workspaceId: string) {
  const count = (sql: string) => (db.prepare(sql).get(workspaceId) as { n: number }).n;
  return {
    plan: workspacePlan(workspaceId),
    limits: limitsFor(workspaceId),
    used: {
      brands: count("SELECT COUNT(*) AS n FROM brands WHERE workspace_id = ? AND archived_at IS NULL"),
      socialAccounts: count("SELECT COUNT(*) AS n FROM accounts WHERE workspace_id = ? AND status != 'disconnected'"),
      videosPerMonth: monthUsage(workspaceId, "videos_uploaded"),
      aiGenerationsPerMonth: monthUsage(workspaceId, "ai_generations"),
      teamMembers: count("SELECT COUNT(*) AS n FROM workspace_members WHERE workspace_id = ?"),
      storageMb: Math.ceil(count("SELECT COALESCE(SUM(size), 0) AS n FROM media WHERE workspace_id = ?") / 1024 / 1024),
    },
  };
}

const LABEL: Record<keyof Limits, string> = {
  brands: "marcas",
  socialAccounts: "cuentas conectadas",
  videosPerMonth: "vídeos al mes",
  aiGenerationsPerMonth: "textos de IA al mes",
  historyDays: "días de histórico",
  teamMembers: "miembros del equipo",
  storageMb: "MB de almacenamiento",
};

/**
 * Solo la IA se paga: es el único límite que responde 402 (y el que invita a mejorar de plan).
 * El resto de topes son iguales en todos los planes (protegen la instalación), así que mejorar no los cambia: 409.
 */
export function planLimitError(key: keyof Limits, limit: number) {
  if (key === "aiGenerationsPerMonth") {
    return limit === 0
      ? new ApiError(402, "plan_limit", "La IA (transcripción, título, descripción y hashtags) está incluida en los planes Pro y Business.")
      : new ApiError(402, "plan_limit", `Tu plan incluye ${limit} textos de IA al mes y ya los has usado. Mejora tu plan o espera al día 1.`);
  }
  return new ApiError(409, "plan_limit", `Has llegado al máximo de ${limit} ${LABEL[key]}.`);
}

/** ¿Incluye el plan la IA? En Free no: el vídeo queda listo al subirlo y el texto lo escribe el usuario. */
export function planHasAi(workspaceId: string) {
  return limitsFor(workspaceId).aiGenerationsPerMonth > 0;
}

/** Lanza si añadir `adding` supera el límite. Úsalo dentro de la misma transacción que la escritura. */
export function assertWithinLimit(workspaceId: string, key: Exclude<keyof Limits, "historyDays">, adding = 1) {
  const s = usageSummary(workspaceId);
  const limit = s.limits[key];
  if (s.used[key] + adding > limit) throw planLimitError(key, limit);
}
