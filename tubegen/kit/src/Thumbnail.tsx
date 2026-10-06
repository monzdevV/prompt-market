import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { ThumbnailProps } from "./types";
import * as fonts from "./lib/fonts";

/**
 * Miniatura 1280×720. Pocas palabras (3–5), una en color de acento,
 * contraste alto y legible a tamaño de móvil.
 */
export const Thumbnail: React.FC<ThumbnailProps> = ({ text, emphasis, kicker, media, theme }) => {
  const emph = new Set((emphasis ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "");
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {media ? (
        <>
          <Img src={/^https?:/.test(media) ? media : staticFile(media)} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", right: 0 }} />
          <AbsoluteFill style={{ background: `linear-gradient(90deg, ${theme.bg} 20%, ${theme.bg}cc 50%, ${theme.bg}22 100%)` }} />
        </>
      ) : (
        <AbsoluteFill
          style={{
            background: `radial-gradient(55% 70% at 85% 30%, ${theme.accent}55, transparent 70%), radial-gradient(40% 50% at 10% 100%, ${theme.accent2}33, transparent 70%)`,
          }}
        />
      )}
      <AbsoluteFill style={{ padding: "70px 80px", justifyContent: "center" }}>
        {kicker ? (
          <div
            style={{
              alignSelf: "flex-start",
              fontFamily: fonts.mono,
              fontSize: 30,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: theme.bg,
              background: theme.accent,
              padding: "8px 18px",
              borderRadius: 10,
              marginBottom: 28,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 0.92,
            letterSpacing: "-0.045em",
            color: theme.fg,
            maxWidth: 900,
            textWrap: "balance",
            textShadow: `0 6px 40px ${theme.bg}`,
          }}
        >
          {text.split(/\s+/).map((w, i) => (
            <span key={i} style={{ color: emph.has(clean(w)) ? theme.accent : undefined }}>
              {w}{" "}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
