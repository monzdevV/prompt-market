import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene, Theme } from "./types";
import { Headline, Kicker, MediaLayer } from "./components";
import { EASE_OUT, enter, exit, unit } from "./lib/motion";
import * as fonts from "./lib/fonts";

type Props = { scene: Scene; theme: Theme; vertical: boolean; index: number; total: number; factNumber?: number };

/** Escenas que se pintan con la plantilla "Fact" (la que muestra la etiqueta "Dato NN" si no traen label). */
const OWN_LAYOUT = ["hook", "stat", "list", "compare", "quote", "outro"];
export const isFactScene = (scene: Scene) => !OWN_LAYOUT.includes(scene.visual.kind) && !scene.visual.label;

/** Contenedor de escena: coloca el contenido y aplica la salida suave al final. */
const Frame: React.FC<{ vertical: boolean; center?: boolean; children: React.ReactNode }> = ({
  vertical,
  center,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const u = unit(width, height);
  const out = exit(frame, durationInFrames, 7);
  return (
    <AbsoluteFill
      style={{
        opacity: out,
        filter: `blur(${(1 - out) * 6}px)`,
        padding: vertical ? `${height * 0.14}px ${70 * u}px ${height * 0.36}px` : `${110 * u}px ${150 * u}px ${170 * u}px`,
        justifyContent: "center",
        alignItems: center || vertical ? "center" : "flex-start",
        textAlign: center || vertical ? "center" : "left",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 34 * u, maxWidth: vertical ? "100%" : width * 0.72, alignItems: "inherit" }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const SceneVisual: React.FC<Props> = (props) => {
  const { scene, theme, index } = props;
  const media = scene.visual.media ? <MediaLayer media={scene.visual.media} theme={theme} seed={index} /> : null;
  return (
    <AbsoluteFill>
      {media}
      <Body {...props} />
      {scene.visual.credit ? <Credit text={scene.visual.credit} theme={theme} /> : null}
    </AbsoluteFill>
  );
};

const Body: React.FC<Props> = (p) => {
  switch (p.scene.visual.kind) {
    case "hook":
      return <Hook {...p} />;
    case "stat":
      return <Stat {...p} />;
    case "list":
      return <List {...p} />;
    case "compare":
      return <Compare {...p} />;
    case "quote":
      return <Quote {...p} />;
    case "outro":
      return <Outro {...p} />;
    case "broll":
    case "fact":
    default:
      return <Fact {...p} />;
  }
};

const useU = () => {
  const { width, height } = useVideoConfig();
  return unit(width, height);
};

const Hook: React.FC<Props> = ({ scene, theme, vertical }) => {
  const u = useU();
  const v = scene.visual;
  return (
    <Frame vertical={vertical} center>
      {v.label ? <Kicker theme={theme} size={26 * u}>{v.label}</Kicker> : null}
      <Headline
        text={v.headline ?? scene.text}
        emphasis={v.emphasis}
        theme={theme}
        size={(vertical ? 118 : 132) * u}
        align="center"
        delay={2}
      />
      {v.sub ? <Sub text={v.sub} theme={theme} delay={14} /> : null}
    </Frame>
  );
};

const Fact: React.FC<Props> = ({ scene, theme, vertical, factNumber }) => {
  const u = useU();
  const v = scene.visual;
  return (
    <Frame vertical={vertical}>
      <Kicker theme={theme} size={26 * u}>{v.label ?? `Dato ${String(factNumber ?? 1).padStart(2, "0")}`}</Kicker>
      <Headline text={v.headline ?? ""} emphasis={v.emphasis} theme={theme} size={(vertical ? 92 : 104) * u} align={vertical ? "center" : "left"} delay={4} />
      {v.sub ? <Sub text={v.sub} theme={theme} delay={16} /> : null}
    </Frame>
  );
};

const Sub: React.FC<{ text: string; theme: Theme; delay: number }> = ({ text, theme, delay }) => {
  const frame = useCurrentFrame();
  const u = useU();
  const t = enter(frame, delay, 16);
  return (
    <div
      style={{
        fontFamily: fonts.text,
        fontWeight: 500,
        fontSize: 40 * u,
        lineHeight: 1.3,
        color: theme.muted,
        maxWidth: 1100 * u,
        opacity: t,
        translate: `0px ${(1 - t) * 18 * u}px`,
        textWrap: "pretty",
      }}
    >
      {text}
    </div>
  );
};

const Stat: React.FC<Props> = ({ scene, theme, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useU();
  const v = scene.visual;
  const target = v.value ?? 0;
  const count = interpolate(frame, [4, 4 + 1.4 * fps], [0, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const shown = count.toLocaleString("es-ES", {
    minimumFractionDigits: v.decimals ?? 0,
    maximumFractionDigits: v.decimals ?? 0,
  });
  const t = enter(frame, 2, 14);
  return (
    <Frame vertical={vertical} center={vertical}>
      {v.label ? <Kicker theme={theme} size={26 * u}>{v.label}</Kicker> : null}
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: (vertical ? 210 : 260) * u,
          lineHeight: 0.9,
          letterSpacing: "-0.05em",
          color: theme.accent,
          fontVariantNumeric: "tabular-nums",
          opacity: t,
          scale: String(0.92 + 0.08 * t),
          transformOrigin: vertical ? "center" : "left center",
          whiteSpace: "nowrap",
        }}
      >
        {v.prefix}
        {shown}
        <span style={{ fontSize: "0.42em", color: theme.fg, marginLeft: "0.08em" }}>{v.suffix}</span>
      </div>
      {v.headline ? (
        <Headline text={v.headline} emphasis={v.emphasis} theme={theme} size={(vertical ? 64 : 70) * u} align={vertical ? "center" : "left"} delay={16} />
      ) : null}
      {v.sub ? <Sub text={v.sub} theme={theme} delay={26} /> : null}
    </Frame>
  );
};

const List: React.FC<Props> = ({ scene, theme, vertical }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const u = useU();
  const v = scene.visual;
  const items = v.items ?? [];
  // Cada punto aparece cuando la voz lo menciona; si no se encuentra, se reparten en el tiempo.
  const starts = items.map((it, i) => {
    const key = it.toLowerCase().split(/\s+/)[0]?.replace(/[^\p{L}\p{N}]/gu, "");
    const w = scene.words.find((w) => w.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") === key);
    return w ? Math.round(w.start * fps) : Math.round(12 + (i * (durationInFrames - 30)) / Math.max(items.length, 1));
  });
  return (
    <Frame vertical={vertical}>
      {v.headline ? <Headline text={v.headline} emphasis={v.emphasis} theme={theme} size={(vertical ? 72 : 78) * u} align={vertical ? "center" : "left"} /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 * u, alignSelf: "stretch" }}>
        {items.map((it, i) => {
          const t = enter(frame, starts[i], 12);
          const current = frame >= starts[i] && (i === items.length - 1 || frame < starts[i + 1]);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 26 * u,
                opacity: t * (current ? 1 : 0.55),
                translate: `${(1 - t) * 40 * u}px 0px`,
                fontFamily: fonts.text,
                fontWeight: 700,
                fontSize: (vertical ? 50 : 52) * u,
                color: theme.fg,
                textAlign: "left",
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 30 * u, color: theme.accent, minWidth: 54 * u }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {it}
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

const Compare: React.FC<Props> = ({ scene, theme, vertical }) => {
  const frame = useCurrentFrame();
  const u = useU();
  const v = scene.visual;
  const side = (s: { label: string; value: string } | undefined, i: number) => {
    const t = enter(frame, 6 + i * 6, 16);
    return (
      <div
        style={{
          flex: 1,
          width: vertical ? "86%" : undefined,
          padding: 44 * u,
          borderRadius: 28 * u,
          background: `${theme.fg}0d`,
          border: `1px solid ${theme.fg}1f`,
          opacity: t,
          translate: vertical ? `0px ${(1 - t) * 40 * u}px` : `${(1 - t) * (i === 0 ? -50 : 50) * u}px 0px`,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: fonts.mono, fontSize: 24 * u, letterSpacing: "0.12em", textTransform: "uppercase", color: theme.muted }}>
          {s?.label}
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 100 * u, letterSpacing: "-0.04em", color: i === 0 ? theme.fg : theme.accent, marginTop: 12 * u }}>
          {s?.value}
        </div>
      </div>
    );
  };
  const vs = enter(frame, 14, 12);
  return (
    <Frame vertical={vertical} center>
      {v.headline ? <Headline text={v.headline} emphasis={v.emphasis} theme={theme} size={(vertical ? 70 : 78) * u} align="center" /> : null}
      <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: 28 * u, alignSelf: "stretch" }}>
        {side(v.left, 0)}
        <div style={{ fontFamily: fonts.serif, fontSize: 60 * u, color: theme.accent2, opacity: vs }}>vs</div>
        {side(v.right, 1)}
      </div>
      {v.sub ? <Sub text={v.sub} theme={theme} delay={24} /> : null}
    </Frame>
  );
};

const Quote: React.FC<Props> = ({ scene, theme, vertical }) => {
  const u = useU();
  const v = scene.visual;
  return (
    <Frame vertical={vertical} center>
      <Headline text={`“${v.headline ?? scene.text}”`} emphasis={v.emphasis} theme={theme} size={(vertical ? 80 : 90) * u} align="center" font={fonts.serif} />
      {v.sub ? <Kicker theme={theme} size={24 * u} delay={20}>{v.sub}</Kicker> : null}
    </Frame>
  );
};

const Outro: React.FC<Props> = ({ scene, theme, vertical }) => {
  const u = useU();
  const v = scene.visual;
  return (
    <Frame vertical={vertical} center>
      <Headline text={v.headline ?? "¿Lo sabías?"} emphasis={v.emphasis} theme={theme} size={(vertical ? 96 : 110) * u} align="center" />
      {v.sub ? <Sub text={v.sub} theme={theme} delay={14} /> : null}
    </Frame>
  );
};

const Credit: React.FC<{ text: string; theme: Theme }> = ({ text, theme }) => {
  const u = useU();
  return (
    <div style={{ position: "absolute", left: 40 * u, bottom: 30 * u, fontFamily: fonts.mono, fontSize: 16 * u, color: `${theme.fg}66` }}>
      {text}
    </div>
  );
};
