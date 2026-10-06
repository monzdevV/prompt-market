// Sube el vídeo largo y el Short de un job a YouTube.
// Uso: npm run upload -- <job> [--only long|short] [--schedule]   (--schedule = próxima franja del canal)
import fs from "node:fs";
import path from "node:path";
import { OUT, args, jobDir, loadChannel, log, readJson } from "./lib/config.mjs";
import { recordHistory, srt, updateMeta, youtubeTexts } from "./lib/steps.mjs";
import { uploadVideo } from "./lib/youtube.mjs";
import { nextSlot } from "./lib/schedule.mjs";

const a = args();
const id = a._[0];
if (!id) throw new Error("Uso: npm run upload -- <job-id>");
const channel = loadChannel();
const out = path.join(OUT, id);
const meta = readJson(path.join(jobDir(id), "meta.json"), {});
const texts = youtubeTexts(id);
const uploads = { ...(meta.uploads ?? {}) };
const cad = channel.cadence;
const ok = (u) => Boolean(u?.videoId); // solo cuenta como subido si la API devolvió un videoId

if ((!a.only || a.only === "long") && !ok(uploads.long) && fs.existsSync(path.join(out, "long.mp4"))) {
  const long = readJson(path.join(jobDir(id), "long.json"));
  const res = await uploadVideo({
    file: path.join(out, "long.mp4"),
    ...texts.long,
    channel,
    publishAt: a.schedule ? nextSlot({ hour: cad.publishHourLocal, timeZone: cad.timezone }) : undefined,
    thumbnail: path.join(out, "thumb.png"),
    captionsSrt: srt(long),
  });
  if (ok(res)) {
    uploads.long = res;
    updateMeta(id, { uploads });
  }
}

if ((!a.only || a.only === "short") && !ok(uploads.short) && fs.existsSync(path.join(out, "short.mp4"))) {
  const link = ok(uploads.long) ? `\n\nVídeo completo: https://youtu.be/${uploads.long.videoId}` : "";
  const res = await uploadVideo({
    file: path.join(out, "short.mp4"),
    title: texts.short.title,
    description: texts.short.description + link,
    tags: texts.short.tags,
    channel,
    publishAt: a.schedule ? nextSlot({ hour: cad.publishHourLocal, timeZone: cad.timezone, daysAhead: 1 }) : undefined,
  });
  if (ok(res)) {
    uploads.short = res;
    updateMeta(id, { uploads });
  }
}

// Solo se marca como subido (y se apunta en el historial) si YouTube confirmó al menos un vídeo.
if (!Object.values(uploads).some(ok)) {
  log(`No se ha subido nada: falta out/${id}/long.mp4 o short.mp4 (npm run render -- ${id}). El job no se marca como subido.`);
  process.exit(1);
}
updateMeta(id, { status: "uploaded", uploads });
recordHistory({ id, title: texts.long.title, pillar: meta.idea?.pillar, uploads });
if (Object.values(uploads).some((u) => u.privacy === "private")) {
  log(
    "Los vídeos están en PRIVADO. Si no usaste --schedule, es porque tu proyecto de Google Cloud aún no pasó la auditoría de la API:\n" +
      "publícalos desde YouTube Studio. En el Short, añade el vídeo largo como 'Vídeo relacionado'.",
  );
}
