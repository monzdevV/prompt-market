import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import type { EpisodeProps } from "./types";
import { Backdrop, Captions, Headline, Kicker, Progress, Watermark } from "./components";
import { SceneVisual, isFactScene } from "./scenes";
import { unit } from "./lib/motion";

export const FPS = 30;
/** respiro tras cada frase, en segundos */
const GAP = 0.3;
export const END_SCREEN_S = 20;

const sceneFrames = (duration: number, fps: number) => Math.ceil((duration + GAP) * fps);

export const episodeFrames = (props: EpisodeProps, fps = FPS) =>
  props.scenes.reduce((acc, s) => acc + sceneFrames(s.duration, fps), 0) + (props.endScreen ? END_SCREEN_S * fps : 0);

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = ({ props }) => ({
  durationInFrames: Math.max(1, episodeFrames(props)),
  defaultOutName: props.id,
});

export const Episode: React.FC<EpisodeProps> = (props) => {
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const { theme } = props;
  let cursor = 0;
  let facts = 0; // "Dato NN" cuenta solo las escenas de dato, empezando en 01
  const placed = props.scenes.map((scene, i) => {
    const from = cursor;
    const dur = sceneFrames(scene.duration, fps);
    cursor += dur;
    const factNumber = isFactScene(scene) ? ++facts : undefined;
    return { scene, from, dur, i, factNumber };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Backdrop theme={theme} />
      {placed.map(({ scene, from, dur, i, factNumber }) => (
        <Sequence key={i} from={from} durationInFrames={dur} name={`${i + 1} · ${scene.visual.kind}`}>
          <SceneVisual scene={scene} theme={theme} vertical={vertical} index={i} total={placed.length} factNumber={factNumber} />
          {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
          {props.captions ? <Captions words={scene.words} theme={theme} vertical={vertical} /> : null}
        </Sequence>
      ))}
      {props.endScreen ? (
        <Sequence from={cursor} durationInFrames={END_SCREEN_S * fps} name="Pantalla final">
          <EndScreen {...props} />
        </Sequence>
      ) : null}
      {props.music ? <Audio src={staticFile(props.music)} volume={props.musicVolume ?? 0.07} loop /> : null}
      <Watermark name={props.channelName} theme={theme} vertical={vertical} />
      <Progress theme={theme} vertical={vertical} />
    </AbsoluteFill>
  );
};

/** Deja hueco para los elementos de pantalla final de YouTube (vídeo recomendado + suscribirse). */
const EndScreen: React.FC<EpisodeProps> = ({ theme, channelName }) => {
  const { width, height } = useVideoConfig();
  const u = unit(width, height);
  const box: React.CSSProperties = {
    position: "absolute",
    border: `2px dashed ${theme.fg}26`,
    borderRadius: 20 * u,
  };
  return (
    <AbsoluteFill style={{ padding: 110 * u, justifyContent: "flex-start" }}>
      <Kicker theme={theme} size={26 * u}>{channelName}</Kicker>
      <div style={{ height: 30 * u }} />
      <Headline text="Sigue la curiosidad" emphasis="curiosidad" theme={theme} size={96 * u} />
      {/* huecos orientativos donde YouTube coloca sus tarjetas */}
      <div style={{ ...box, right: 150 * u, top: 330 * u, width: 820 * u, height: 461 * u }} />
      <div style={{ ...box, left: 150 * u, top: 520 * u, width: 260 * u, height: 260 * u, borderRadius: "50%" }} />
    </AbsoluteFill>
  );
};
