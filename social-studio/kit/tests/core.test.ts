import { describe, expect, it } from "vitest";
import { buildCaption, clipWords, normalizeHashtags, overLimit } from "@/lib/core/caption";
import { tiktokChunks } from "@/lib/core/chunks";
import { parseRange } from "@/lib/core/range";
import { validateTikTokOptions, type TikTokOptions } from "@/lib/core/tiktok-options";
import { normalizeCopy, buildPrompt } from "@/lib/ai";
import { looksLikeVideo, safeOriginalName } from "@/lib/media";

const MB = 1024 * 1024;

describe("hashtags y texto", () => {
  it("normaliza, deduplica sin mayúsculas y respeta el máximo", () => {
    expect(normalizeHashtags(["#Patinaje", "patinaje", " hockey hielo ", "##", "#Madrid!"], 3)).toEqual([
      "Patinaje",
      "hockeyhielo",
      "Madrid",
    ]);
  });

  it("construye la descripción con hashtags al final", () => {
    expect(buildCaption("  Hola  ", ["a", "b"])).toBe("Hola\n\n#a #b");
    expect(buildCaption("Hola", [])).toBe("Hola");
  });

  it("detecta las redes cuyo límite se supera", () => {
    const text = "x".repeat(2500);
    expect(overLimit(text, ["instagram", "youtube", "tiktok", "instagram"])).toEqual(["instagram", "tiktok"]);
  });

  it("recorta sin partir palabras", () => {
    expect(clipWords("uno dos tres cuatro", 12)).toBe("uno dos tres");
    expect(clipWords("corto", 100)).toBe("corto");
  });
});

describe("salida de la IA", () => {
  it("aplica límites reales aunque la IA se pase", () => {
    const out = normalizeCopy({
      title: "Palabra ".repeat(30),
      description: "  desc  ",
      keywords: ["a", "a", " b ", "", "c", "d", "e", "f", "g", "h", "i"],
      hashtags: ["#uno", "dos", "Uno", "tres", "cuatro", "cinco"],
    });
    expect(out.title.length).toBeLessThanOrEqual(100);
    expect(out.description).toBe("desc");
    expect(out.keywords).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expect(out.hashtags).toEqual(["uno", "dos", "tres", "cuatro"]);
  });

  it("aísla la transcripción y usa el idioma detectado si no hay uno fijado", () => {
    const settings = { sector: "", audience: "", language: "", tone: "", extraKeywords: "" };
    const p = buildPrompt({ transcript: "hola", settings, detectedLanguage: "es", fileName: "v.mp4" });
    expect(p).toContain("<transcripcion>\nhola\n</transcripcion>");
    expect(p).toContain("código es");
    const silent = buildPrompt({ transcript: "  ", settings, detectedLanguage: null, fileName: "clase.mp4" });
    expect(silent).toContain("no tiene voz");
    expect(silent).toContain("clase.mp4");
  });
});

describe("trozos de TikTok", () => {
  it("hasta 64 MB va en un trozo", () => {
    expect(tiktokChunks(30 * MB)).toMatchObject({ count: 1, chunkSize: 30 * MB });
  });

  it("los trozos cubren el fichero entero sin huecos y el último absorbe el resto", () => {
    const size = 95 * MB + 123;
    const { ranges, count } = tiktokChunks(size);
    expect(count).toBe(9);
    expect(ranges[0].start).toBe(0);
    expect(ranges.at(-1)!.end).toBe(size);
    for (let i = 1; i < ranges.length; i++) expect(ranges[i].start).toBe(ranges[i - 1].end);
  });

  it("rechaza un fichero vacío", () => {
    expect(() => tiktokChunks(0)).toThrow();
  });
});

describe("cabecera Range", () => {
  it("interpreta los tres formatos", () => {
    expect(parseRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
  });

  it("rechaza rangos imposibles", () => {
    expect(parseRange("bytes=500-100", 1000)).toBeNull();
    expect(parseRange("bytes=2000-", 1000)).toBeNull();
    expect(parseRange("bytes=-", 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
  });
});

describe("subida de vídeos", () => {
  it("reconoce MP4/MOV y WebM por su firma, no por el nombre", () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(4)]);
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
    expect(looksLikeVideo(mp4)).toBe(true);
    expect(looksLikeVideo(webm)).toBe(true);
    expect(looksLikeVideo(Buffer.from("<html><script>"))).toBe(false);
  });

  it("limpia el nombre original (sin rutas ni caracteres de control)", () => {
    expect(safeOriginalName(encodeURIComponent("../../etc/passwd.mp4"))).toBe("passwd.mp4");
    expect(safeOriginalName("%E0%A4%A")).toBe("%E0%A4%A");
    expect(safeOriginalName(null)).toBe("video.mp4");
    expect(safeOriginalName(encodeURIComponent("C:\\Users\\x\\clip\u0007.mov"))).toBe("clip.mov");
  });
});

describe("opciones de TikTok", () => {
  const base: TikTokOptions = {
    privacyLevel: "PUBLIC_TO_EVERYONE",
    allowComment: true,
    allowDuet: true,
    allowStitch: true,
    commercial: { enabled: false, yourBrand: false, brandedContent: false },
  };

  it("exige indicar el tipo de contenido comercial", () => {
    expect(validateTikTokOptions({ ...base, commercial: { enabled: true, yourBrand: false, brandedContent: false } })).toBeTruthy();
    expect(validateTikTokOptions({ ...base, commercial: { enabled: true, yourBrand: true, brandedContent: false } })).toBeNull();
  });

  it("no permite contenido patrocinado en privado", () => {
    expect(
      validateTikTokOptions({ ...base, privacyLevel: "SELF_ONLY", commercial: { enabled: true, yourBrand: false, brandedContent: true } }),
    ).toBeTruthy();
  });
});

describe("filas de la base", () => {
  it("son objetos normales (se pueden pasar a componentes de cliente de React)", async () => {
    const { db } = await import("@/lib/db");
    const row = db.prepare("SELECT 1 AS uno, 'a' AS letra").get();
    const rows = db.prepare("SELECT 1 AS uno UNION ALL SELECT 2").all();
    expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
    expect(rows.every((r) => Object.getPrototypeOf(r) === Object.prototype)).toBe(true);
  });
});
