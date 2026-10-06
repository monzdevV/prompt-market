/**
 * IDENTIDAD DE LA MARCA · única fuente de verdad.
 *
 * Para cambiar de gimnasio: edita este archivo, los colores de
 * `src/design/tokens.ts` (genera la propuesta con `node scripts/contraste.mjs --generar <hex>`)
 * y los textos de las secciones de `src/components/landing/`.
 */

/** Nombre comercial tal y como se escribe en frases ("Acepto que X use mis datos"). */
const nombre = "Ice Gym";

/** Escapa un texto para usarlo literal dentro de una expresión regular. */
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Enlaces de contacto opcionales. Vacíos no se pintan (columna "La web" del pie). */
export type Contacto = {
  /** "hola@tugimnasio.com" */
  email: string;
  /** "+34 600 000 000" */
  telefono: string;
  /** Número con prefijo internacional, "+34600000000". */
  whatsapp: string;
  /** URL completa del perfil. */
  instagram: string;
  tiktok: string;
  facebook: string;
  youtube: string;
};

export const MARCA = {
  nombre,
  /** Logotipo partido en dos: [tinta, acento]. También el rótulo gigante del pie. */
  logo: ["ICE", "GYM"] as const,
  /** Identificador en minúsculas, sin espacios. */
  slug: "ice-gym",
  /** Dominio del correo del equipo (placeholder del acceso al CRM). */
  dominio: "icegym.com",
  /** Meta description de la web pública. */
  descripcion: `Cadena de gimnasios ${nombre}. Entrena en Madrid, Barcelona y Valencia con acceso libre, clases colectivas y sin permanencia.`,
  /** Prefijo que se quita del nombre de cada centro ("Ice Gym Chamberí" → "Chamberí"). */
  prefijoCentros: new RegExp(`^${escapar(nombre)}\\s+`, "i"),
  /** Clave de localStorage con el tema elegido (claro/oscuro), compartida por web y CRM. */
  claveTema: "ice-tema",
  /** Evento con el que las tarjetas de tarifa preseleccionan la tarifa en el formulario. */
  eventoTarifa: "ice:tarifa",
  /** Zona horaria de los centros: horarios, "abierto ahora" y fechas del CRM. */
  zonaHoraria: "Europe/Madrid",
  locale: "es-ES",
  moneda: "EUR",
  contacto: {
    email: "",
    telefono: "",
    whatsapp: "",
    instagram: "",
    tiktok: "",
    facebook: "",
    youtube: "",
  } satisfies Contacto as Contacto,
} as const;

/** Monograma derivado del nombre: "Ice Gym" → "IG". */
export const inicialesMarca = nombre
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((p) => p.charAt(0).toUpperCase())
  .join("");

/** Nombre del centro sin el prefijo de la marca. */
export const sinMarca = (nombreCentro: string) => nombreCentro.replace(MARCA.prefijoCentros, "");
