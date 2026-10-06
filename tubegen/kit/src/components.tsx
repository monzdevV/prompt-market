import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import type { Theme, Word } from "./types";
import { EASE_OUT, enter, unit } from "./lib/motion";
import * as fonts from "./lib/fonts";

const isVideo = (p: string) => /\.(mp4|webm|mov)$/i.test(p);
const src = (p: string) => (/^https?:/.test(p) ? p : staticFile(p));

/** Fondo común: color base, resplandor que deriva despacio, retícula fina y grano. */
export const Backdrop: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = unit(width, height);
  const drift = Math.sin(frame / 240) * 12;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at ${30 + drift}% ${25 - drift / 2}%, ${theme.accent}22, transparent 70%), radial-gradient(50% 45% at ${75 - drift}% ${80 + drift / 3}%, ${theme.accent2}1c, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${theme.fg}0a 1px, transparent 1px), linear-gradient(90deg, ${theme.fg}0a 1px, transparent 1px)`,
          backgroundSize: `${90 * u}px ${90 * u}px`,
          backgroundPosition: `${(frame * 0.15) % (90 * u)}px 0px`,
          maskImage: "radial-gradient(80% 70% at 50% 50%, black, transparent)",
        }}
      />
      <Grain />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => (
  <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay" }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

/** Material de fondo (vídeo o foto) con zoom lento tipo Ken Burns y velo oscuro para que se lea el texto. */
export const MediaLayer: React.FC<{ media: string; theme: Theme; dim?: number; seed?: number }> = ({
  media,
  theme,
  dim = 0.62,
  seed = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const dir = seed % 2 === 0 ? 1 : -1;
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    scale: String(interpolate(frame, [0, durationInFrames], [1.04, 1.14])),
    translate: `${interpolate(frame, [0, durationInFrames], [0, 2.5 * dir])}% 0%`,
  };
  return (
    <AbsoluteFill style={{ opacity: enter(frame, 0, 10) }}>
      {isVideo(media) ? <Video src={src(media)} muted loop style={style} /> : <Img src={src(media)} style={style} />}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${theme.bg}${alpha(dim * 0.7)} 0%, ${theme.bg}${alpha(dim)} 55%, ${theme.bg} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const alpha = (a: number) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");

/**
 * Titular que entra palabra a palabra (subida corta + desenfoque que se aclara).
 * La parte `emphasis` va en color de acento con un subrayado que se dibuja.
 */
export const Headline: React.FC<{
  text: string;
  emphasis?: string;
  theme: Theme;
  size: number;
  delay?: number;
  align?: "left" | "center";
  font?: string;
}> = ({ text, emphasis, theme, size, delay = 0, align = "left", font = fonts.display }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  const emph = new Set((emphasis ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "");
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.98,
        letterSpacing: "-0.03em",
        color: theme.fg,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.26,
        rowGap: size * 0.06,
        textWrap: "balance",
      }}
    >
      {words.map((w, i) => {
        const t = enter(frame, delay + i * 2, 14);
        const isEmph = emph.has(clean(w));
        const line = enter(frame, delay + i * 2 + 8, 14);
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              opacity: t,
              translate: `0px ${(1 - t) * size * 0.35}px`,
              filter: `blur(${(1 - t) * 8}px)`,
              color: isEmph ? theme.accent : undefined,
            }}
          >
            {w}
            {isEmph ? (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -size * 0.06,
                  height: size * 0.08,
                  background: theme.accent,
                  borderRadius: size,
                  clipPath: `inset(0 ${(1 - line) * 100}% 0 0)`,
                }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

/** Etiqueta pequeña monoespaciada, p. ej. "DATO 03" */
export const Kicker: React.FC<{ children: React.ReactNode; theme: Theme; size: number; delay?: number }> = ({
  children,
  theme,
  size,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const t = enter(frame, delay, 12);
  return (
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: size,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: theme.accent,
        display: "flex",
        alignItems: "center",
        gap: size * 0.7,
        opacity: t,
        translate: `${(1 - t) * -size}px 0px`,
      }}
    >
      <span style={{ width: size * 2.2, height: 2, background: theme.accent, scale: `${t} 1`, transformOrigin: "left" }} />
      {children}
    </div>
  );
};

/**
 * Subtítulos sincronizados con la voz. Agrupa palabras en "páginas" cortas
 * y resalta la palabra que se está diciendo.
 */
export const Captions: React.FC<{ words: Word[]; theme: Theme; vertical: boolean }> = ({ words, theme, vertical }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = unit(width, height);
  const t = frame / fps;
  const pages = paginate(words, vertical ? 3 : 7);
  const idx = pages.findIndex((p, i) => t >= p[0].start && (i === pages.length - 1 || t < pages[i + 1][0].start));
  if (idx < 0) return null;
  const page = pages[idx];
  const pageIn = enter(frame, Math.round(page[0].start * fps), 6);
  const size = vertical ? 78 * u : 46 * u;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: vertical ? height * 0.2 : 70 * u,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: vertical ? fonts.display : fonts.text,
          fontWeight: vertical ? 800 : 700,
          fontSize: size,
          lineHeight: 1.1,
          textAlign: "center",
          maxWidth: vertical ? width * 0.86 : width * 0.7,
          textTransform: vertical ? "uppercase" : "none",
          letterSpacing: vertical ? "-0.01em" : "0",
          color: theme.fg,
          padding: vertical ? 0 : `${10 * u}px ${22 * u}px`,
          borderRadius: 14 * u,
          background: vertical ? "transparent" : `${theme.bg}cc`,
          textShadow: vertical ? `0 ${4 * u}px ${18 * u}px ${theme.bg}, 0 0 ${3 * u}px ${theme.bg}` : "none",
          opacity: pageIn,
          scale: String(0.94 + 0.06 * pageIn),
        }}
      >
        {page.map((w, i) => {
          const active = t >= w.start && t < w.end + 0.08;
          return (
            <span key={i} style={{ color: active ? theme.accent : undefined }}>
              {w.text}
              {i < page.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const paginate = (words: Word[], max: number) => {
  const pages: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    // Corta al final de frase o en pausa (la puntuación se alinea con el guion en pipeline/lib/tts.mjs).
    if (cur.length >= max || /[.,;:!?…]["'»”)]*$/.test(w.text)) {
      pages.push(cur);
      cur = [];
    }
  }
  if (cur.length) pages.push(cur);
  return pages;
};

/** Barra de progreso fina: ayuda a la retención en Shorts y vídeos largos. */
export const Progress: React.FC<{ theme: Theme; vertical: boolean }> = ({ theme, vertical }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const u = unit(width, height);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [vertical ? "top" : "bottom"]: 0,
        height: 6 * u,
        background: `${theme.fg}14`,
      }}
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          background: theme.accent,
          scale: `${interpolate(frame, [0, durationInFrames - 1], [0, 1], { extrapolateRight: "clamp", easing: (x) => x })} 1`,
          transformOrigin: "left",
        }}
      />
    </div>
  );
};

export const Watermark: React.FC<{ name: string; theme: Theme; vertical: boolean }> = ({ name, theme, vertical }) => {
  const { width, height } = useVideoConfig();
  const u = unit(width, height);
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? 120 * u : 44 * u,
        left: vertical ? 0 : undefined,
        right: vertical ? 0 : 56 * u,
        textAlign: "center",
        fontFamily: fonts.mono,
        fontSize: 22 * u,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: `${theme.fg}80`,
      }}
    >
      {name}
    </div>
  );
};

export { EASE_OUT };
