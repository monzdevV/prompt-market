import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { OUT, ROOT, jobDir, loadChannel, log, readJson } from "./config.mjs";

/**
 * Renderiza long.mp4, short.mp4 y thumb.png de un job.
 * La carpeta del job se usa como carpeta pública, así staticFile("audio/...") apunta a sus archivos.
 */
export async function renderJob(id, { only } = {}) {
  const dir = jobDir(id);
  const outDir = path.join(OUT, id);
  fs.mkdirSync(outDir, { recursive: true });
  log("Empaquetando Remotion…");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts"), publicDir: dir });
  const concurrency = Math.max(1, Math.floor(os.cpus().length * 0.75));
  const results = {};

  for (const [kind, comp] of [
    ["long", "Long"],
    ["short", "Short"],
  ]) {
    if (only && only !== kind) continue;
    const props = readJson(path.join(dir, `${kind}.json`));
    if (!props) continue;
    const composition = await selectComposition({ serveUrl, id: comp, inputProps: props });
    const file = path.join(outDir, `${kind}.mp4`);
    let last = -1;
    await renderMedia({
      serveUrl,
      composition,
      inputProps: props,
      codec: "h264",
      crf: 20,
      concurrency,
      outputLocation: file,
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 20);
        if (p !== last) {
          last = p;
          process.stdout.write(`\r${kind}: ${Math.round(progress * 100)}%   `);
        }
      },
    });
    process.stdout.write("\n");
    log(`${kind} → ${path.relative(ROOT, file)} (${(composition.durationInFrames / composition.fps).toFixed(0)} s)`);
    results[kind] = file;
  }

  if (!only || only === "thumb") {
    const script = readJson(path.join(dir, "script.json"));
    const long = readJson(path.join(dir, "long.json"));
    const media = long?.scenes.map((s) => s.visual.media).find((m) => m && /\.jpe?g$/i.test(m));
    const inputProps = { ...script.thumbnail, media, theme: loadChannel().theme };
    const composition = await selectComposition({ serveUrl, id: "Thumbnail", inputProps });
    const file = path.join(outDir, "thumb.png");
    await renderStill({ serveUrl, composition, inputProps, output: file });
    log(`miniatura → ${path.relative(ROOT, file)}`);
    results.thumb = file;
  }
  return results;
}
