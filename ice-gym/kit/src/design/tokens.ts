/**
 * TOKENS DE DISEÑO
 *
 * Única fuente de verdad del sistema visual. `cssTemas()` genera las variables
 * de los dos temas y el layout las inyecta en el <head>; globals.css sólo las
 * mapea a nombres de Tailwind. Ningún componente escribe un color a mano.
 *
 * Mundo: grafismo de retransmisión deportiva. Placas opacas y planas, cortes
 * inclinados, condensada gruesa en mayúsculas y cifras tabulares.
 * El azul hielo sólo es campo sólido con texto negro; el bengala sólo marca
 * impagos. Todos los pares de texto pasan WCAG AA en ambos temas.
 */

import { MARCA } from "@/marca";

/** Colores de marca fijados por el cliente. */
export const marca = {
  negro: "#0A0B0D",
  hielo: "#F2F7FA",
  azul: "#5CE1FF",
  bengala: "#FF4D2E",
} as const;

type Tema = {
  /** Suelo de la página. */
  fondo: string;
  /** Placa: filas, paneles, campos. */
  placa: string;
  /** Placa vecina: pasar el ratón, cabeceras de tabla. Siempre opaca. */
  placa2: string;
  /** Líneas de 1 px. */
  linea: string;
  /** Texto principal. */
  tinta: string;
  /** Texto secundario (≥ 6:1 en todas las placas). */
  tinta2: string;
  /** Azul como texto o icono sobre el fondo. */
  acentoTinta: string;
  /** Bengala como texto: sólo en importes impagados. */
  alarmaTinta: string;
  /** Series de gráficos, validadas con la guía de visualización. */
  datoAzul: string;
  datoBengala: string;
  /** Rampa de un solo tono para el embudo, de etapa temprana a avanzada. */
  rampa: readonly string[];
  /** Estado "baja" y cualquier cosa retirada. */
  apagado: string;
};

export const temas: Record<"claro" | "oscuro", Tema> = {
  claro: {
    fondo: "#F2F7FA",
    placa: "#FFFFFF",
    placa2: "#E4ECF1",
    linea: "#CCD6DD",
    tinta: "#0A0B0D",
    tinta2: "#4E5864",
    acentoTinta: "#0A6A87",
    alarmaTinta: "#B5301A",
    datoAzul: "#037B9D", // 4,50:1 sobre #F2F7FA y 4,86:1 sobre #FFF (antes #1C86A8: 3,87:1)
    datoBengala: "#D93A1E",
    rampa: ["#5BB8D5", "#3A9FC0", "#2786A6", "#1C6C88", "#13536A", "#0B3A4C"],
    apagado: "#9AA5AF",
  },
  oscuro: {
    fondo: "#0A0B0D",
    placa: "#121418",
    placa2: "#1B1E24",
    linea: "#262A31",
    tinta: "#F2F7FA",
    tinta2: "#949DA8",
    acentoTinta: "#5CE1FF",
    alarmaTinta: "#FF6B4F",
    datoAzul: "#2C9BBF",
    datoBengala: "#F0472B",
    rampa: ["#11536A", "#18728E", "#2295B7", "#4FB6D4", "#82D2E9", "#B9E9F7"],
    apagado: "#4A515C",
  },
};

/** Tipografía: la condensada del logotipo manda en todo lo que no es una frase. */
export const fuente = {
  display: "var(--font-display)",
  cuerpo: "var(--font-body)",
} as const;

/** Desplazamiento horizontal del corte inclinado (≈ 70° en una placa de 32 px). */
export const corte = {
  placa: "12px",
  pestana: "14px",
  rotulo: "22px",
} as const;

/** Movimiento: una cortina al entrar y cifras que suben. Nada más. */
export const movimiento = {
  rapido: 0.16,
  normal: 0.32,
  lento: 0.7,
  /** Ease-out exponencial, sin rebote. */
  curva: [0.23, 1, 0.32, 1] as const,
  /** Para lo que se desplaza por la pantalla (filas que cambian de puesto). */
  curvaMovimiento: [0.77, 0, 0.175, 1] as const,
  escalon: 0.04,
} as const;

/** Códigos de tres letras de los centros, como los de los pilotos. */
export function codigoCentro(slugONombre: string | null | undefined) {
  if (!slugONombre) return "—";
  const limpio = slugONombre.replace(MARCA.prefijoCentros, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return limpio.slice(0, 3).toUpperCase();
}

type Campos = { acento: string; alarma: string; sobreCampo: string };
const camposMarca: Campos = { acento: marca.azul, alarma: marca.bengala, sobreCampo: marca.negro };

/**
 * CRM: herramienta interna. Base en negro y grises neutros (sin tinte), azul
 * como único color de acción y de marca dentro de la herramienta, y rojo /
 * ámbar / verde reservados para estados: error, aviso y correcto.
 * Las superficies se separan por tono, no por bordes: la línea es casi muda.
 */
export const temasCrm: Record<"claro" | "oscuro", Tema & Campos> = {
  claro: {
    fondo: "#F4F4F5",
    placa: "#FFFFFF",
    placa2: "#EEEEF0",
    linea: "#E4E4E7",
    tinta: "#111113",
    tinta2: "#5F5F68",
    acentoTinta: "#1D5FD6",
    alarmaTinta: "#C81E1E",
    datoAzul: "#2563EB",
    datoBengala: "#D9468F",
    rampa: ["#DBE8FE", "#BCD4FD", "#93BBFB", "#5F97F6", "#2F72EA", "#1D55C7"],
    apagado: "#A1A1AA",
    acento: "#2563EB",
    alarma: "#DC2626",
    sobreCampo: "#FFFFFF",
  },
  oscuro: {
    fondo: "#0A0A0B",
    placa: "#141416",
    placa2: "#1C1C1F",
    linea: "#26262A",
    tinta: "#EDEDEF",
    tinta2: "#9B9BA3",
    acentoTinta: "#7EAEFF",
    alarmaTinta: "#F87171",
    datoAzul: "#3B82F6",
    datoBengala: "#E0569E",
    rampa: ["#152A52", "#1B3A73", "#224C98", "#2C61BF", "#3F7BE6", "#6B9BF7"],
    apagado: "#4B4B52",
    acento: "#2F6FEB",
    alarma: "#EF4444",
    sobreCampo: "#FFFFFF",
  },
};

/**
 * Sólo CRM: series de gráficas (paleta categórica validada, el azul primero),
 * estados con su fondo suave opaco y rellenos de etiquetas, logos y avatares.
 */
const extrasCrm = {
  claro: {
    "serie-1": "#2563EB",
    "serie-2": "#D9468F",
    "serie-3": "#7C5CF0",
    "serie-4": "#0E9AB8",
    "serie-5": "#A1A1AA",
    exito: "#15803D",
    aviso: "#B45309",
    critico: "#C81E1E",
    "exito-suave": "#E3F5EA",
    "aviso-suave": "#FDF0DC",
    "critico-suave": "#FCE7E7",
    "acento-suave": "#E8F0FE",
    "sobre-critico": "#FFFFFF",
    "sobre-relleno": "#FFFFFF",
    "marca-gym": "#0A86B0",
    columna: "#EBEBED",
    tarjeta: "#FFFFFF",
    "tag-azul": "#1D5FD6",
    "tag-verde": "#15803D",
    "tag-ambar": "#B45309",
    "tag-violeta": "#6D4FD8",
    "tag-rosa": "#BE185D",
    "tag-gris": "#71717A",
    "tag-cian": "#0E7C93",
    "relleno-azul": "#2563EB",
    "relleno-verde": "#15803D",
    "relleno-ambar": "#B45309",
    "relleno-violeta": "#7C5CF0",
    "relleno-rosa": "#C2367D",
    "relleno-gris": "#52525B",
    "relleno-cian": "#0B7A95",
    "relleno-rojo": "#DC2626",
    sombra: "0 1px 2px rgb(17 17 19 / 0.05), 0 2px 8px -2px rgb(17 17 19 / 0.06)",
  },
  oscuro: {
    "serie-1": "#3B82F6",
    "serie-2": "#E0569E",
    "serie-3": "#8B6CF6",
    "serie-4": "#1499B8",
    "serie-5": "#52525B",
    exito: "#4ADE80",
    aviso: "#FBBF24",
    critico: "#F87171",
    "exito-suave": "#122A1C",
    "aviso-suave": "#2E2310",
    "critico-suave": "#311718",
    "acento-suave": "#172338",
    "sobre-critico": "#2A0E0E",
    "sobre-relleno": "#FFFFFF",
    "marca-gym": "#5CE1FF",
    columna: "#0F0F11",
    tarjeta: "#1A1A1D",
    "tag-azul": "#7EAEFF",
    "tag-verde": "#4ADE80",
    "tag-ambar": "#FBBF24",
    "tag-violeta": "#B39DFF",
    "tag-rosa": "#F38BBE",
    "tag-gris": "#A1A1AA",
    "tag-cian": "#5CC8E0",
    "relleno-azul": "#2F6FEB",
    "relleno-verde": "#15803D",
    "relleno-ambar": "#B45309",
    "relleno-violeta": "#6D4FD8",
    "relleno-rosa": "#BE3A7D",
    "relleno-gris": "#3F3F46",
    "relleno-cian": "#0E7C93",
    "relleno-rojo": "#C42B2B",
    sombra: "0 1px 0 rgb(255 255 255 / 0.03) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)",
  },
} as const;

function variablesExtra(e: Record<string, string>) {
  return Object.entries(e)
    .map(([k, v]) => `--${k}:${v}`)
    .join(";");
}

function variables(t: Tema, c: Campos = camposMarca) {
  return [
    `--fondo:${t.fondo}`,
    `--placa:${t.placa}`,
    `--placa-2:${t.placa2}`,
    `--linea:${t.linea}`,
    `--tinta:${t.tinta}`,
    `--tinta-2:${t.tinta2}`,
    `--acento:${c.acento}`,
    `--acento-tinta:${t.acentoTinta}`,
    `--alarma:${c.alarma}`,
    `--alarma-tinta:${t.alarmaTinta}`,
    `--sobre-campo:${c.sobreCampo}`,
    `--dato-azul:${t.datoAzul}`,
    `--dato-bengala:${t.datoBengala}`,
    `--apagado:${t.apagado}`,
    ...t.rampa.map((c, i) => `--rampa-${i}:${c}`),
  ].join(";");
}

/**
 * CSS de los dos temas. Sin preferencia guardada manda el sistema;
 * `data-tema` en <html> fija uno a mano.
 */
export function cssTemas() {
  const claro = variables(temas.claro);
  const oscuro = variables(temas.oscuro);
  const crmClaro = `${variables(temasCrm.claro, temasCrm.claro)};${variablesExtra(extrasCrm.claro)};color-scheme:light`;
  const crmOscuro = `${variables(temasCrm.oscuro, temasCrm.oscuro)};${variablesExtra(extrasCrm.oscuro)};color-scheme:dark`;
  return [
    // El CRM es oscuro por defecto; sólo un "claro" elegido a mano lo aclara.
    `.crm{${crmOscuro}}`,
    // La landing vive de noche, como sus fotos: siempre oscura.
    `.landing{${oscuro};color-scheme:dark}`,
    `:root[data-tema="claro"] .crm{${crmClaro}}`,
    `:root{${claro};color-scheme:light}`,
    `@media (prefers-color-scheme: dark){:root:not([data-tema="claro"]){${oscuro};color-scheme:dark}}`,
    `:root[data-tema="oscuro"]{${oscuro};color-scheme:dark}`,
    `:root[data-tema="claro"]{${claro};color-scheme:light}`,
    `:root{--corte-placa:${corte.placa};--corte-pestana:${corte.pestana};--corte-rotulo:${corte.rotulo}}`,
  ].join("");
}

/**
 * Se ejecuta antes de pintar para aplicar el tema guardado sin parpadeo.
 * La preferencia es sólo de este navegador: vive en localStorage.
 */
export const scriptTema = `(function(){try{var t=localStorage.getItem(${JSON.stringify(MARCA.claveTema)});if(t==="claro"||t==="oscuro"){document.documentElement.setAttribute("data-tema",t)}}catch(e){}})();`;
