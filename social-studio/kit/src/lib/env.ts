import { z } from "zod";
import { resolveClaude } from "./manny/claude-bin";

/**
 * Validación de la configuración al arrancar. En producción, un error aquí detiene el servidor
 * (mejor no arrancar que arrancar con redirecciones OAuth a localhost o cookies sin Secure).
 */
const intPositive = z.coerce.number().int().positive();

const Schema = z
  .object({
    NODE_ENV: z.string().optional(),
    APP_URL: z.url("APP_URL debe ser una URL completa (https://…)"),
    TOKEN_ENC_KEY: z
      .string("Falta TOKEN_ENC_KEY")
      .refine((v) => Buffer.from(v, "base64").length === 32, "TOKEN_ENC_KEY debe ser 32 bytes en base64"),
    ADMIN_EMAIL: z.email("ADMIN_EMAIL no es un email válido").optional().or(z.literal("")),
    SIGNUP_MODE: z.enum(["invite", "open"]).optional().or(z.literal("")),
    TRUST_PROXY: z.enum(["cloudflare", "forwarded", "none"]).optional().or(z.literal("")),
    MAX_UPLOAD_MB: intPositive.optional().or(z.literal("")),
    STORAGE_QUOTA_MB: intPositive.optional().or(z.literal("")),
    WHISPER_TIMEOUT_S: intPositive.optional().or(z.literal("")),
    SYNC_INTERVAL_HOURS: intPositive.optional().or(z.literal("")),
    UPLOAD_RETENTION_DAYS: intPositive.optional().or(z.literal("")),
    BACKUP_KEEP: intPositive.optional().or(z.literal("")),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (!env.APP_URL.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(env.APP_URL)) {
      ctx.addIssue({ code: "custom", path: ["APP_URL"], message: "En producción APP_URL debe ser https:// (o localhost)" });
    }
    if (env.APP_URL.startsWith("https://") && !env.ADMIN_EMAIL) {
      ctx.addIssue({ code: "custom", path: ["ADMIN_EMAIL"], message: "Con la app en internet define ADMIN_EMAIL: si no, el primero en registrarse sería administrador" });
    }
  });

const PAIRS = [
  ["META_APP_ID", "META_APP_SECRET"],
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
] as const;

/**
 * errors: configuración peligrosa (en producción no se arranca).
 * softErrors: algo no funcionará, pero se arranca igual (se registra como error).
 * warnings: avisos.
 */
export function checkEnv(env: Record<string, string | undefined> = process.env) {
  const errors: string[] = [];
  const softErrors: string[] = [];
  const warnings: string[] = [];
  const r = Schema.safeParse({ ...env, APP_URL: env.APP_URL ?? "http://localhost:3000" });
  if (!r.success) for (const i of r.error.issues) errors.push(`${i.path.join(".")}: ${i.message}`);
  for (const [a, b] of PAIRS) {
    if (!!env[a] !== !!env[b]) warnings.push(`Solo está definida una de ${a} / ${b}: esa red no se podrá conectar`);
  }
  // Sin clave de la API, la IA usa Claude Code (`claude -p`) con tu suscripción. Solo se mira el disco, sin lanzarlo
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) {
    if (resolveClaude(env)) warnings.push("Sin ANTHROPIC_API_KEY: la IA escribirá los textos con Claude Code (claude -p) y tu suscripción");
    else softErrors.push("Ni ANTHROPIC_API_KEY ni Claude Code (claude) en el PATH: la IA no podrá escribir textos. Instala Claude Code, pon su ruta en MANNY_CLAUDE_BIN o define ANTHROPIC_API_KEY");
  }
  const legalMissing = ["LEGAL_NAME", "LEGAL_ID", "LEGAL_ADDRESS", "CONTACT_EMAIL"].filter((k) => !env[k]?.trim());
  if (legalMissing.length) warnings.push(`Faltan datos legales (${legalMissing.join(", ")}): las páginas legales muestran «pendiente»`);
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) warnings.push("STRIPE_SECRET_KEY sin STRIPE_WEBHOOK_SECRET: los pagos no activarán el plan");
  return { errors, softErrors, warnings };
}
