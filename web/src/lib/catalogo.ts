import datos from "@/data/catalogo.json";

export type Bloque =
  | { t: "h" | "p" | "sub"; texto: string }
  | { t: "lista" | "pasos"; items: { texto: string; nivel: number }[] }
  | { t: "tabla"; cabecera: string[]; filas: string[][] };

export type Producto = {
  slug: string;
  codigo: string;
  titulo: string;
  subtitulo: string;
  categoria: string;
  stack: string[];
  precio: number;
  precioBorrador?: boolean;
  dificultad: string;
  tiempoInstalacion: string;
  requisitos: string[];
  preguntas?: number;
  publicado: boolean;
  stripePaymentLink: string;
  captura: string;
  faq: { p: string; r: string }[];
  readme: { h1: string; tipo: string; verificacion: string; lema: string; intro: Bloque[]; secciones: { titulo: string; bloques: Bloque[] }[] };
  vistaPrevia: { lineas: string[]; total: number };
  paquete: {
    contenido: { ruta: string; tipo: string; archivos: number; bytes: number; lineas: number }[];
    archivos: number;
    bytes: number;
    lineasCodigo: number;
  };
};

// El JSON ya viene filtrado (solo publicado: true); se vuelve a filtrar por si acaso.
export const productos: Producto[] = (datos.productos as Producto[]).filter((p) => p.publicado === true);

export function productoPorSlug(slug: string): Producto | undefined {
  return productos.find((p) => p.slug === slug);
}

export const categorias = Array.from(new Set(productos.map((p) => p.categoria)));

export function nombreCategoria(c: string) {
  return c === "IA" ? "IA" : c.charAt(0).toUpperCase() + c.slice(1);
}

const euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const formatoPrecio = (n: number) => euros.format(n);

const numero = new Intl.NumberFormat("es-ES");
export const formatoNumero = (n: number) => numero.format(n);

export function formatoBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(b / 1024)).toLocaleString("es-ES")} KB`;
}

// Preguntas frecuentes comunes a todos los paquetes.
export const faqGeneral: { p: string; r: string }[] = [
  {
    p: "¿Qué recibo exactamente al comprar?",
    r: "Un zip con el prompt maestro (PROMPT.md), el mapa de personalización (PERSONALIZAR.md), la especificación (SPEC.md), la ficha (README.md) y la carpeta kit/ con el código original completo y verificado.",
  },
  {
    p: "¿Por qué no basta con el prompt?",
    r: "Ninguna IA reescribe miles de líneas igual dos veces: un prompt solo produce algo parecido. El kit garantiza el 1:1. El prompt no reinventa el proyecto: lo instala y lo personaliza con tus datos.",
  },
  {
    p: "¿Funciona con mi IA?",
    r: "Con un agente que toca archivos (Claude Code, Cursor, Windsurf, Codex, Copilot Agent) el resultado es idéntico a la demo. Con un chat (claude.ai, ChatGPT, Gemini) la IA te guía paso a paso y te da los archivos uno a uno. Sin kit, puede reconstruirlo desde SPEC.md, fiel pero no idéntico línea a línea.",
  },
  {
    p: "¿La IA inventa datos para rellenar?",
    r: "No. Todos los prompts tienen la regla de no inventar reseñas, cifras ni clientes. Si falta un dato, la sección se oculta o se queda el texto neutro.",
  },
  {
    p: "¿Mis claves están seguras?",
    r: "Las claves solo van a tu archivo .env.local, las pegas tú y nunca se escriben en el chat ni en el código. Nosotros no vemos nada: todo pasa entre tu IA y tu ordenador.",
  },
  {
    p: "¿Puedo usarlo para un cliente?",
    r: "Sí: cada compra da licencia para un proyecto, personal o comercial. No se puede revender ni redistribuir el kit ni el prompt. Los detalles están en la licencia de uso.",
  },
];

/** «PartyUp · app social de fiestas» → «PartyUp» (para rótulos grandes). */
export function nombreCorto(titulo: string) {
  return titulo.split("·")[0].trim();
}
