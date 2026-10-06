import React from "react";
import { Composition, Still } from "remotion";
import { Episode, FPS, calculateEpisodeMetadata } from "./Episode";
import { Thumbnail } from "./Thumbnail";
import { sampleEpisode } from "./sample";
import { defaultTheme } from "./theme";

export const Root: React.FC = () => (
  <>
    <Composition
      id="Long"
      component={Episode}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={300}
      defaultProps={{ ...sampleEpisode, captions: false, endScreen: true }}
      calculateMetadata={calculateEpisodeMetadata}
    />
    <Composition
      id="Short"
      component={Episode}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={300}
      defaultProps={sampleEpisode}
      calculateMetadata={calculateEpisodeMetadata}
    />
    <Still
      id="Thumbnail"
      component={Thumbnail}
      width={1280}
      height={720}
      defaultProps={{ text: "El pulpo tiene 3 corazones", emphasis: "3 corazones", kicker: "Biología", theme: defaultTheme }}
    />
  </>
);
