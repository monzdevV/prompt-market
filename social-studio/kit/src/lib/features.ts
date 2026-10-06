import type { Platform } from "./db";

/**
 * Interruptores de funcionalidades que dependen de aprobaciones de las redes.
 * Se leen del entorno en cada llamada para poder cambiarlos sin recompilar.
 */

/** Publicar en una red. Activado por defecto; PUBLISH_TIKTOK=false (etc.) lo apaga sin tocar el código. */
export function publishingEnabled(platform: Platform) {
  if (platform === "linkedin" && process.env.FEATURE_LINKEDIN !== "true") return false;
  return process.env[`PUBLISH_${platform.toUpperCase()}`] !== "false";
}

/**
 * Mientras TikTok no audite la app, su API solo admite publicaciones privadas ("Solo yo")
 * y la cuenta del creador debe ser privada (developers.tiktok.com, Content Posting API · Get started).
 */
export function tiktokAudited() {
  return process.env.TIKTOK_AUDITED === "true";
}

/** Programar en TikTok: la documentación no lo prohíbe, pero se deja apagado hasta confirmarlo en la auditoría. */
export function tiktokSchedulingAllowed() {
  return process.env.TIKTOK_ALLOW_SCHEDULING === "true";
}

export function clientFeatures() {
  return {
    tiktokAudited: tiktokAudited(),
    tiktokScheduling: tiktokSchedulingAllowed(),
  };
}

export type ClientFeatures = ReturnType<typeof clientFeatures>;
