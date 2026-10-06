// Formato de un episodio. El pipeline (pipeline/*.mjs) genera este JSON y Remotion lo pinta.

export type Word = {
  text: string;
  /** segundos, relativos al inicio del audio de la escena */
  start: number;
  end: number;
};

export type VisualKind =
  | "hook" // titular grande, palabra a palabra
  | "fact" // dato con etiqueta y subtítulo
  | "stat" // número que cuenta hasta un valor
  | "list" // lista numerada que se va revelando
  | "compare" // A vs B
  | "quote" // cita en serif
  | "broll" // vídeo/imagen a pantalla completa con rótulo
  | "outro"; // cierre / llamada a la acción

export type Visual = {
  kind: VisualKind;
  headline?: string;
  /** palabra (o parte) del titular que va en color de acento */
  emphasis?: string;
  sub?: string;
  label?: string;
  value?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  items?: string[];
  left?: { label: string; value: string };
  right?: { label: string; value: string };
  /** ruta relativa a la carpeta del job (vídeo .mp4 o imagen) para fondo */
  media?: string;
  /** crédito del material (Pexels, Wikimedia...) */
  credit?: string;
};

export type Scene = {
  /** texto que narra la voz */
  text: string;
  /** audio de la escena, relativo a la carpeta del job */
  audio?: string;
  /** duración del audio en segundos */
  duration: number;
  words: Word[];
  visual: Visual;
};

export type Theme = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
};

export type EpisodeProps = {
  id: string;
  title: string;
  channelName: string;
  theme: Theme;
  scenes: Scene[];
  /** subtítulos quemados en el vídeo (imprescindible en Shorts) */
  captions: boolean;
  /** 20 s finales para las pantallas finales de YouTube (solo vídeos largos) */
  endScreen: boolean;
  music?: string;
  musicVolume?: number;
};

export type ThumbnailProps = {
  text: string;
  emphasis?: string;
  kicker?: string;
  media?: string;
  theme: Theme;
};
