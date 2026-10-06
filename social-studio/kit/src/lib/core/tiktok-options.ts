import { z } from "zod";

/**
 * Opciones que TikTok exige que el creador elija en cada publicación (Content Posting API, Direct Post):
 * privacidad elegida manualmente (sin valor por defecto), interacciones y declaración de contenido comercial.
 */
export const TikTokOptionsSchema = z.object({
  privacyLevel: z.string().min(1, "Elige quién puede ver el vídeo en TikTok"),
  allowComment: z.boolean(),
  allowDuet: z.boolean(),
  allowStitch: z.boolean(),
  commercial: z.object({
    enabled: z.boolean(),
    yourBrand: z.boolean(),
    brandedContent: z.boolean(),
  }),
});

export type TikTokOptions = z.infer<typeof TikTokOptionsSchema>;

/** Reglas de TikTok que no se expresan con tipos. Devuelve el problema o null. */
export function validateTikTokOptions(o: TikTokOptions): string | null {
  if (o.commercial.enabled && !o.commercial.yourBrand && !o.commercial.brandedContent) {
    return "Si el vídeo promociona una marca, indica si es tu marca o contenido patrocinado";
  }
  if (o.commercial.enabled && o.commercial.brandedContent && o.privacyLevel === "SELF_ONLY") {
    return "El contenido patrocinado no puede publicarse como privado en TikTok";
  }
  return null;
}

/** Texto legal que TikTok exige mostrar antes de publicar. */
export function tiktokConsentText(o: Pick<TikTokOptions, "commercial">) {
  return o.commercial.enabled && o.commercial.brandedContent
    ? "Al publicar, aceptas la Política de contenido de marca y la Confirmación de uso de música de TikTok."
    : "Al publicar, aceptas la Confirmación de uso de música de TikTok.";
}

export const TIKTOK_PRIVACY_LABEL: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Todo el mundo",
  MUTUAL_FOLLOW_FRIENDS: "Amigos",
  FOLLOWER_OF_CREATOR: "Seguidores",
  SELF_ONLY: "Solo yo",
};
