/**
 * Datos del titular que exigen la LSSI (aviso legal) y el RGPD (responsable del tratamiento).
 * Se configuran por entorno para no escribir datos personales en el código. Mientras falte alguno,
 * las páginas legales lo marcan como «pendiente» (nunca se inventa) y /api/health lo avisa.
 */
export function legalInfo() {
  const name = process.env.LEGAL_NAME?.trim() || "";
  const id = process.env.LEGAL_ID?.trim() || "";
  const address = process.env.LEGAL_ADDRESS?.trim() || "";
  const email = process.env.CONTACT_EMAIL?.trim() || "";
  return {
    /** Nombre y apellidos (autónomo) o razón social */
    name: name || "el titular de Manny",
    /** NIF / CIF */
    id,
    /** Domicilio (calle, código postal, ciudad) */
    address,
    email,
    /** Datos registrales (solo sociedades): «Inscrita en el Registro Mercantil de …» */
    registry: process.env.LEGAL_REGISTRY?.trim() || "",
    updated: process.env.LEGAL_UPDATED || "23 de septiembre de 2026",
    missing: [!name && "nombre o razón social (LEGAL_NAME)", !id && "NIF (LEGAL_ID)", !address && "domicilio (LEGAL_ADDRESS)", !email && "email de contacto (CONTACT_EMAIL)"].filter(
      Boolean,
    ) as string[],
  };
}

/** Versión de los textos que se acepta al registrarse (se guarda con cada usuario). */
export const TERMS_VERSION = () => legalInfo().updated;

/** Edad mínima para usar el servicio (LOPDGDD art. 7: 14 años para consentir en España). */
export const MIN_AGE = 14;
