import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Static TTF copies (SIL Open Font License) of the site's fonts, for the images drawn with next/og,
// which can't use next/font. They live in /assets/fonts and are only read at build time.
const font = (file: string) => readFile(join(process.cwd(), "assets", "fonts", file));

export async function ogFonts() {
  const [display, serif, mono] = await Promise.all([
    font("Unbounded-ExtraBold.ttf"),
    font("InstrumentSerif-Italic.ttf"),
    font("GeistMono-Regular.ttf"),
  ]);
  return [
    { name: "Unbounded", data: display, weight: 800 as const, style: "normal" as const },
    { name: "Instrument Serif", data: serif, weight: 400 as const, style: "italic" as const },
    { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}

/** The first letter of the name, for the favicon. */
export const initial = (name: string) => [...name.trim()][0]?.toUpperCase() ?? "·";
