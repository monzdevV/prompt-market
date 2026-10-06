import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { monogram } from "@/lib/monogram";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(monogram(size.width), { ...size, fonts: await ogFonts() });
}
