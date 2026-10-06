import { ImageResponse } from "next/og";
import { profile, siteTitle } from "@/content";
import { ogFonts } from "@/lib/og-fonts";

// The card shown when the link is shared: the name under a falling star, like the hero.
export const alt = siteTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const words = profile.name.trim().toUpperCase().split(/\s+/);
  const longest = Math.max(...words.map((w) => [...w].length));
  // Unbounded runs ~0.92em per capital; fit the longest word in the 1040px text column.
  const nameSize = Math.round(Math.min(150, 1040 / (longest * 0.92), words.length > 1 ? 120 : 150));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0 80px 72px",
          position: "relative",
          color: "#e3e7ff",
          backgroundColor: "#050816",
          backgroundImage:
            "radial-gradient(ellipse 80% 90% at 70% 0%, #1b2466 0%, #0e1438 40%, #060a1c 72%, #03050d 100%)",
        }}
      >
        {/* Star: halo, flare and core, with its trail. */}
        <div
          style={{
            position: "absolute",
            left: 860,
            top: 40,
            width: 4,
            height: 190,
            borderRadius: 4,
            backgroundImage: "linear-gradient(0deg, rgba(255,255,255,0.9), rgba(183,166,255,0.25) 40%, rgba(183,166,255,0))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 712,
            top: 82,
            width: 300,
            height: 300,
            borderRadius: 300,
            backgroundImage:
              "radial-gradient(circle, rgba(255,179,92,0.45) 0%, rgba(183,166,255,0.16) 30%, rgba(143,150,255,0.05) 52%, rgba(0,0,0,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 772,
            top: 231,
            width: 180,
            height: 2,
            backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95), rgba(255,255,255,0))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 861,
            top: 182,
            width: 2,
            height: 100,
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.95), rgba(255,255,255,0))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 852,
            top: 222,
            width: 20,
            height: 20,
            borderRadius: 20,
            backgroundColor: "#ffffff",
            boxShadow: "0 0 18px 6px #ffffff, 0 0 60px 20px rgba(255,179,92,0.6)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontFamily: "Geist Mono",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8e9ad0",
            marginBottom: 22,
          }}
        >
          {profile.role}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontFamily: "Unbounded",
            fontWeight: 800,
            fontSize: nameSize,
            lineHeight: 0.88,
            letterSpacing: -0.045 * nameSize,
          }}
        >
          {words.map((w, i) => (
            <span key={i} style={{ marginRight: i < words.length - 1 ? 0.3 * nameSize : 0 }}>
              {w}
            </span>
          ))}
          <span style={{ color: "#ff9a3c" }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Instrument Serif",
            fontStyle: "italic",
            fontSize: 40,
            color: "#ffc27a",
            marginTop: 26,
            maxWidth: 960,
          }}
        >
          {profile.statement}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
