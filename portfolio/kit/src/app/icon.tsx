import { ImageResponse } from "next/og";
import { monogram } from "@/lib/monogram";
import { ogFonts } from "@/lib/og-fonts";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(monogram(size.width), { ...size, fonts: await ogFonts() });
}
