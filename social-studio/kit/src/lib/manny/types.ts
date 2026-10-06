/** Guion de un vídeo o carrusel. En `gancho`, lo que va entre asteriscos se resalta en amarillo. */
export type PlanScript = {
  id: string;
  /** Día de la semana abreviado (Lun…Dom) y hora de España, si está planificado */
  dia: string | null;
  hora: string | null;
  titulo: string;
  formato: string;
  etiquetas: string[];
  gancho: string;
  voz: string[];
  planos: string[];
  edicion: string[];
  descripcion: string;
  hashtags: string;
  referencia: { texto: string; url: string } | null;
};

export const STYLE_LABEL = {
  correcto: "Correcto vs incorrecto",
  musculo: "Músculo marcado",
  trayectoria: "Línea de la barra",
  ia3d: "Anatomía 3D",
  ia: "Explicador con IA",
  dibujo: "Dibujo o 2D",
  subt: "Hablado con subtítulos",
  cine: "Edit de gym",
  transfo: "Transformación",
} as const;

export type StyleKey = keyof typeof STYLE_LABEL;

/** Vídeo de referencia verificado: visitas y seguidores leídos de su página el 29/09/2026. */
export type Reference = {
  plataforma: "tt" | "yt" | "ig";
  cuenta: string;
  seguidores: number;
  visitas: number;
  url: string;
  titulo: string;
  estilo: StyleKey;
  dificultad: 1 | 2 | 3;
  idioma: "es" | "en";
  /** Qué copiar. Lo que va entre ** se muestra en negrita. */
  queCopiar: string;
};

export const SCRIPT_STATUSES = ["pendiente", "grabado", "publicado", "descartado"] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];
