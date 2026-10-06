// ============================================================================================
//  TODO EL CONTENIDO DE LA WEB VIVE AQUÍ.
//  Perfil, redes, proyectos, tecnologías, textos de cada sección, robot del contacto y SEO.
//  Lo que trae ahora es una DEMO FICTICIA («Alex Rivera» y 6 proyectos inventados): cámbialo todo.
//  Las imágenes de los proyectos están en public/proyectos/<slug>/.
// ============================================================================================

// --------------------------------------------------------------------------------------------
// 1 · Quién eres

export const profile = {
  /** Sale gigante en la portada. El tamaño se ajusta solo a la longitud (y parte en líneas por los espacios). */
  name: "Alex Rivera",
  role: "Diseñador y desarrollador",
  /** 5-8 palabras. Las DOS ÚLTIMAS salen en degradado. */
  statement: "Diseño y construyo interfaces que se recuerdan.",
  /** Las palabras entre *asteriscos* salen en cursiva con degradado (máx. 3 marcas). */
  about:
    "Diseño y desarrollo productos digitales *de principio a fin*: de la primera idea en papel al último detalle de la animación. Me gusta que las cosas *funcionen bien* y que además *se sientan bien* al usarlas.",
  /** En qué estás ahora. Déjalo en "" para ocultar la línea «Ahora». */
  now: "Una app de rutas a pie para una ciudad pequeña",
  location: "Valencia, España",
  /** Zona horaria IANA del reloj de la portada. */
  timeZone: "Europe/Madrid",
  /** Locale para formatear la hora y los números. */
  locale: "es-ES",
  available: "Disponible para proyectos",
  /** Verbo del rotador de la portada: «{verb} {builds[i]}». */
  verb: "Construyo",
  builds: ["webs que se sienten vivas", "apps móviles", "identidades de marca", "paneles a medida"],
  /** Tres frases cortas (máx. 4 palabras) que aparecen mientras cae la estrella. */
  fall: ["Una idea", "Un diseño", "Algo que funciona"],
  services: [
    {
      title: "Webs y landings",
      text: "Sitios rápidos y con carácter, pensados para que quien entra entienda qué haces y te escriba.",
    },
    {
      title: "Producto digital",
      text: "Apps y paneles a medida, del flujo en papel al código en producción.",
    },
    {
      title: "Marca y editorial",
      text: "Identidades, piezas impresas y sistemas visuales que se sostienen en pantalla y en papel.",
    },
  ],
  email: "hola@example.com",
};

/**
 * Redes del contacto: se reparten en dos pilas (izquierda las posiciones 1, 3…; derecha 2, 4…).
 * `icon` es un PNG cuadrado en public/social/. `invert: true` para logos negros (GitHub).
 * Déjalo vacío ([]) para quitar las pilas.
 */
export const socials: { label: string; href: string; icon: string; invert?: boolean }[] = [
  { label: "Instagram", href: "https://example.com/instagram", icon: "/social/instagram.png" },
  { label: "LinkedIn", href: "https://example.com/linkedin", icon: "/social/linkedin.png" },
  { label: "TikTok", href: "https://example.com/tiktok", icon: "/social/tiktok.png" },
  { label: "GitHub", href: "https://example.com/github", icon: "/social/github.png", invert: true },
];

/** Dos filas de herramientas: la marquesina del HUD y la sección «Con qué trabajo». 4-6 por fila. */
export const stack: [string[], string[]] = [
  ["Figma", "Next.js", "React", "TypeScript", "Tailwind"],
  ["Motion", "Three.js", "Flutter", "Supabase", "Vercel"],
];

// --------------------------------------------------------------------------------------------
// 2 · Contacto: robot 3D (Spline) o alternativa propia

export const contacto = {
  /**
   * true: carga la escena 3D de Spline de `escena`. false: muestra la alternativa propia (una estrella
   * posada en una órbita, sin dependencias externas). Si la escena falla o tarda demasiado, también.
   */
  robot: true,
  /**
   * Escena pública de Spline. La de serie es un robot de un TERCERO alojado en spline.design: si lo
   * retiran, la web enseña la alternativa. Para la tuya: spline.design → Export → Code → React → URL.
   */
  escena: "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode",
};

// --------------------------------------------------------------------------------------------
// 3 · SEO y datos del sitio

export const site = {
  /**
   * URL pública definitiva, sin barra final (p. ej. "https://alexrivera.com"). Se usa en las etiquetas
   * para compartir. Vacía: en Vercel se usa sola la URL de producción del proyecto.
   */
  url: "",
  /** Idioma del <html> y de Open Graph. */
  lang: "es",
  ogLocale: "es_ES",
  /** Título de la pestaña y al compartir. Por defecto: «Nombre — Rol». */
  title: "",
  /** Descripción para buscadores y al compartir (~150 caracteres). Por defecto, el statement. */
  description:
    "Portfolio de Alex Rivera, diseñador y desarrollador: webs, apps y marcas con cuidado por el detalle y el movimiento.",
  keywords: ["portfolio", "diseño web", "desarrollo web", "diseño de producto", "Next.js"],
  /** Usuario de X/Twitter con @, o "". */
  twitter: "",
};

// --------------------------------------------------------------------------------------------
// 4 · Textos de la interfaz (por si traduces la web o quieres otro tono)

export const textos = {
  nav: {
    links: [
      { id: "inicio", label: "Inicio" },
      { id: "sobre-mi", label: "Sobre mí" },
      { id: "proyectos", label: "Proyectos" },
      { id: "contacto", label: "Contacto" },
    ],
    marca: "portfolio",
    cta: "Hablemos",
  },
  hero: {
    saludo: "Hola, soy",
    pista: "Desliza para caer",
    altitud: "Altitud",
    copyright: "Portfolio ©",
  },
  sobreMi: {
    titulo: "Sobre mí",
    nombre: "Nombre",
    rol: "Qué soy",
    lugar: "Dónde",
    ahora: "Ahora",
    servicios: "Qué hago",
  },
  proyectos: {
    titulo: "Trabajo",
    /** Rótulo de la variante Hélice 3D. */
    etiqueta: "Proyectos",
    ayuda: "Desplázate para recorrer · Clic para abrir",
    cargando: "Cargando proyectos",
    verCaso: "Ver el caso",
    imagen: ["imagen", "imágenes"],
    todo: "Todo",
    filtrar: "Filtrar proyectos",
    /** Frase de la variante Cortina. "" = se genera sola con el número de proyectos. */
    intro: "",
  },
  caso: {
    papel: "Papel",
    año: "Año",
    conQue: "Con qué",
    enVivo: "Ver en vivo",
    loQueHace: "Lo que hace",
    siguiente: "Siguiente caso",
    cerrar: "Cerrar el caso",
  },
  stack: { titulo: "Con qué trabajo" },
  contacto: {
    etiqueta: "Contacto",
    titulo: "Hablemos",
    pie: "Hecho con Next.js",
    cargando: "Cargando escena…",
  },
};

// --------------------------------------------------------------------------------------------
// 5 · Proyectos (de 3 a 8 queda mejor; la Hélice 3D alarga la sección 110vh por proyecto)

/** Cómo se presenta cada imagen: ventana de navegador, móvil, página impresa o foto sin marco. */
export type Frame = "browser" | "phone" | "page" | "photo";

export type Shot = {
  src: string;
  /** Píxeles REALES del archivo: next/image los usa para la proporción. */
  width: number;
  height: number;
  alt: string;
  frame: Frame;
  caption?: string;
  /** Dirección que sale en la barra del navegador falso. */
  url?: string;
};

/** Composición de la portada del caso. web: 1-2 imágenes · mobile: 3 móviles · print: 3 páginas · brand: 1 logo. */
export type Layout = "web" | "mobile" | "print" | "brand";

/** Filtros de la variante Rejilla. Si añades una, añádela aquí y en CATEGORIAS. */
export const CATEGORIAS = ["Web", "Móvil", "Diseño"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type Project = {
  slug: string;
  title: string;
  kind: string;
  summary: string;
  description: string;
  highlights: string[];
  /** El primero sale en la tarjeta de la hélice. */
  tags: string[];
  year: string;
  role: string;
  /** Si existe, la ficha muestra «Ver en vivo». */
  href?: string;
  /** Color del proyecto: tonos medios saturados (el texto encima es claro). */
  accent: string;
  layout: Layout;
  categoria: Categoria;
  /** Imagen a pantalla completa para la variante Cortina (opcional). */
  fondo?: Shot;
  cover: Shot[];
  gallery: Shot[];
};

/** Atajo para crear una imagen. La ruta es relativa a public/proyectos/. */
const img = (src: string, width: number, height: number, frame: Frame, alt: string, extra: Partial<Shot> = {}): Shot => ({
  src: `/proyectos/${src}`,
  width,
  height,
  frame,
  alt,
  ...extra,
});

const MAREA = {
  inicio: img("marea/inicio.webp", 1440, 900, "browser", "Portada de la web de Marea: «Aprende a navegar con el viento a favor»", {
    url: "marea.example.com",
    caption: "Portada: cursos y próximas salidas a un clic.",
  }),
  calendario: img("marea/calendario.webp", 1440, 900, "browser", "Calendario de salidas con plazas libres por día", {
    url: "marea.example.com/calendario",
    caption: "El calendario enseña las plazas libres de cada salida.",
  }),
  movil: img("marea/movil.webp", 430, 932, "phone", "La web de Marea en el móvil"),
  fondo: img("marea/fondo.webp", 1920, 1080, "photo", "Olas dibujadas con líneas bajo un sol naranja"),
};

const BRUJULA = [
  img("brujula/rutas.webp", 430, 932, "phone", "Lista de rutas a pie cercanas con su distancia", {
    caption: "Rutas cerca de ti, filtradas por duración y tipo.",
  }),
  img("brujula/mapa.webp", 430, 932, "phone", "Mapa con una ruta punteada entre dos puntos"),
  img("brujula/detalle.webp", 430, 932, "phone", "Detalle de una ruta con su perfil de desnivel"),
  img("brujula/progreso.webp", 430, 932, "phone", "Resumen semanal de kilómetros caminados"),
];

const NODULO = {
  simbolo: img("nodulo/simbolo.webp", 880, 880, "photo", "Símbolo de Nódulo: una N hecha de cuatro nodos"),
  tarjeta: img("nodulo/tarjeta.webp", 1200, 630, "photo", "Logotipo de Nódulo con una onda de sonido", {
    caption: "La tarjeta para compartir, con la onda como textura.",
  }),
};

const ATLAS = [
  img("atlas/portada.webp", 794, 1122, "page", "Portada del fanzine Atlas de luz: una luna roja sobre un cielo estrellado", {
    caption: "Portada del número 3.",
  }),
  img("atlas/articulo.webp", 794, 1122, "page", "Página interior a dos columnas con una cita destacada"),
  img("atlas/carta.webp", 794, 1122, "page", "Carta del cielo de otoño con una constelación marcada en rojo", {
    caption: "Carta del cielo dibujada a mano en vectores.",
  }),
  img("atlas/datos.webp", 794, 1122, "page", "Gráfica de barras de noches oscuras a lo largo del año"),
];

const FERMENTO = {
  inicio: img("fermento/inicio.webp", 1440, 900, "browser", "Portada de la web de Fermento: «Tres días de cocina lenta y viva»", {
    url: "fermento.example.com",
    caption: "Portada con el programa y la venta de entradas.",
  }),
  movil: img("fermento/movil.webp", 430, 932, "phone", "La web de Fermento en el móvil"),
  cartel: img("fermento/cartel.webp", 1200, 630, "photo", "Cartel de Fermento para compartir en redes", {
    caption: "El cartel que aparece al compartir el enlace.",
  }),
  fondo: img("fermento/fondo.webp", 1920, 1080, "photo", "Manchas de color rosa, ámbar y violeta con burbujas"),
};

const CUADRANTE = {
  turnos: img("cuadrante/turnos.webp", 1440, 900, "browser", "Cuadrante semanal de turnos de un equipo de siete personas", {
    url: "app.cuadrante.example.com",
    caption: "La semana entera de un vistazo, con un color por franja.",
  }),
  informes: img("cuadrante/informes.webp", 1440, 900, "browser", "Informes de horas cubiertas y huecos sin asignar", {
    url: "app.cuadrante.example.com/informes",
  }),
};

export const projects: Project[] = [
  {
    slug: "marea",
    title: "Marea",
    kind: "Web con reservas",
    summary: "La web de una escuela de vela, con calendario de salidas y reserva de plaza.",
    description:
      "Web para una escuela de vela pequeña. Enseña los cursos y la flota, y deja reservar plaza en una salida concreta desde el móvil, sin llamadas ni formularios eternos.",
    highlights: [
      "Calendario de salidas con plazas libres por día",
      "Reserva en tres pasos, pensada para el móvil",
      "Panel sencillo para que la escuela abra y cierre salidas",
      "Ilustración de olas animada con SVG, sin vídeo",
    ],
    tags: ["Next.js", "Tailwind", "Supabase"],
    year: "2026",
    role: "Diseño y desarrollo",
    accent: "#2f7fd0",
    layout: "web",
    categoria: "Web",
    fondo: MAREA.fondo,
    cover: [MAREA.inicio, MAREA.movil],
    gallery: [MAREA.inicio, MAREA.calendario, MAREA.movil],
  },
  {
    slug: "brujula",
    title: "Brújula",
    kind: "App móvil",
    summary: "Rutas a pie por la ciudad, elegidas por el tiempo que tienes.",
    description:
      "App para descubrir rutas a pie cortas por la ciudad. Le dices cuánto tiempo tienes y te propone recorridos con miradores, jardines o puentes, con el desnivel y las paradas.",
    highlights: [
      "Rutas filtradas por duración, tipo y distancia",
      "Mapa con la ruta y las paradas, también sin conexión",
      "Perfil de desnivel antes de empezar",
      "Resumen semanal de lo caminado",
    ],
    tags: ["Flutter", "Mapbox", "Supabase"],
    year: "2026",
    role: "Producto, diseño y desarrollo",
    accent: "#d9702f",
    layout: "mobile",
    categoria: "Móvil",
    cover: [BRUJULA[1], BRUJULA[0], BRUJULA[2]],
    gallery: BRUJULA,
  },
  {
    slug: "nodulo",
    title: "Nódulo",
    kind: "Identidad de marca",
    summary: "La identidad de un estudio de sonido: una N hecha de conexiones.",
    description:
      "Identidad para un estudio de grabación y mezcla. El símbolo une cuatro nodos como se unen las pistas de una sesión, y la onda de sonido funciona como textura en todas las piezas.",
    highlights: [
      "Símbolo construido con una retícula de cuatro nodos",
      "Paleta violeta pensada para pantallas oscuras de estudio",
      "Sistema de piezas para redes, web y tarjetas",
      "Guía de uso con versiones en positivo y negativo",
    ],
    tags: ["Figma", "Illustrator", "Identidad"],
    year: "2025",
    role: "Dirección de arte y diseño",
    accent: "#7a52e0",
    layout: "brand",
    categoria: "Diseño",
    cover: [NODULO.simbolo],
    gallery: [NODULO.tarjeta, NODULO.simbolo],
  },
  {
    slug: "atlas",
    title: "Atlas de luz",
    kind: "Diseño editorial",
    summary: "Un fanzine impreso sobre las estrellas que aún se ven desde la ciudad.",
    description:
      "Fanzine de astronomía urbana: cartas del cielo, textos cortos y datos sobre la contaminación lumínica. Maquetado para imprimir en A4 y para leer en PDF en el móvil.",
    highlights: [
      "Cartas del cielo dibujadas a mano en vectores",
      "Retícula a dos columnas con citas destacadas",
      "Gráficas de datos integradas en la maqueta",
      "Versión impresa y PDF ligero para leer en pantalla",
    ],
    tags: ["InDesign", "Illustrator", "Impresión"],
    year: "2025",
    role: "Edición, diseño y maquetación",
    accent: "#c4473c",
    layout: "print",
    categoria: "Diseño",
    cover: [ATLAS[0], ATLAS[2], ATLAS[3]],
    gallery: ATLAS,
  },
  {
    slug: "fermento",
    title: "Fermento",
    kind: "Web de evento",
    summary: "La web de un festival de cocina: programa, cocineros y entradas.",
    description:
      "Web de un festival de cocina de tres días. Reúne el programa por días, las fichas de los cocineros y la venta de entradas, con un cartel animado que da el tono desde el primer segundo.",
    highlights: [
      "Programa por días con filtros por tipo de actividad",
      "Venta de entradas integrada con la pasarela de pago",
      "Cartel animado con burbujas que reacciona al scroll",
      "Tarjetas para compartir generadas para cada actividad",
    ],
    tags: ["Astro", "Motion", "Stripe"],
    year: "2025",
    role: "Diseño y desarrollo",
    accent: "#c93c68",
    layout: "web",
    categoria: "Web",
    fondo: FERMENTO.fondo,
    cover: [FERMENTO.inicio, FERMENTO.movil],
    gallery: [FERMENTO.inicio, FERMENTO.cartel, FERMENTO.movil],
  },
  {
    slug: "cuadrante",
    title: "Cuadrante",
    kind: "Panel web",
    summary: "Turnos de equipos pequeños, sin hojas de cálculo.",
    description:
      "Panel para organizar los turnos de equipos de 5 a 30 personas. Se arrastran franjas sobre la semana, el equipo confirma desde el móvil y los informes enseñan los huecos antes de que pasen.",
    highlights: [
      "Cuadrante semanal con arrastrar y soltar",
      "Avisos al equipo cuando se publican los turnos",
      "Ausencias y cambios de turno con aprobación",
      "Informes de horas cubiertas y huecos sin asignar",
    ],
    tags: ["React", "TypeScript", "PostgreSQL"],
    year: "2024",
    role: "Diseño de producto y frontend",
    accent: "#1f9e8b",
    layout: "web",
    categoria: "Web",
    cover: [CUADRANTE.turnos],
    gallery: [CUADRANTE.turnos, CUADRANTE.informes],
  },
];

// ============================================================================================
//  A partir de aquí no hace falta tocar nada: son valores que se calculan solos.
// ============================================================================================

const NUMEROS = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce"];

/** «seis proyectos», «un proyecto», «15 proyectos». */
export function contarProyectos(n = projects.length) {
  const num = n >= 0 && n < NUMEROS.length ? NUMEROS[n] : String(n);
  return `${num} ${n === 1 ? "proyecto" : "proyectos"}`;
}

export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const año = new Date().getFullYear();

/** Frase de la variante Cortina, si no se ha escrito una en textos.proyectos.intro. */
export function introProyectos() {
  if (textos.proyectos.intro) return textos.proyectos.intro;
  const first = projects[0];
  const last = projects[projects.length - 1];
  const rango = projects.length > 1 ? `, de ${first.title} a ${last.title}` : "";
  return `${mayuscula(contarProyectos())}${rango}. Baja para abrir cada uno.`;
}

export const siteUrl =
  site.url ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const siteTitle = site.title || `${profile.name} — ${profile.role}`;
export const siteDescription = site.description || profile.statement;
