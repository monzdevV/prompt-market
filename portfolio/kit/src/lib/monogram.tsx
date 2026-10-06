import { profile } from "@/content";
import { initial } from "@/lib/og-fonts";

// Favicon art: the first letter of the name on the night sky, with the amber spark of the hero.
export function monogram(px: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: px * 0.22,
        backgroundColor: "#0a0f2a",
        backgroundImage: "radial-gradient(circle at 50% 0%, #2a3290 0%, #0e1438 55%, #050816 100%)",
        color: "#e3e7ff",
        fontFamily: "Unbounded",
        fontWeight: 800,
        fontSize: px * 0.6,
        lineHeight: 1,
      }}
    >
      <span style={{ marginTop: px * 0.04 }}>{initial(profile.name)}</span>
      <div
        style={{
          position: "absolute",
          right: px * 0.14,
          top: px * 0.14,
          width: px * 0.14,
          height: px * 0.14,
          borderRadius: px,
          backgroundColor: "#ffb35c",
          boxShadow: `0 0 ${px * 0.08}px ${px * 0.03}px rgba(255,179,92,0.8)`,
        }}
      />
    </div>
  );
}
