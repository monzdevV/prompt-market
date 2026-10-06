import { db } from "@/lib/db";
import { lastBeat } from "@/lib/jobs";
import { freeDiskBytes } from "@/lib/maintenance";

const MIN_FREE_BYTES = 2 * 1024 ** 3;

/** Para monitorización externa: base de datos, ejecutor de trabajos y espacio en disco. */
export async function GET() {
  try {
    db.prepare("SELECT 1").get();
    const beat = lastBeat();
    const workerOk = beat !== null && Date.now() - beat < 60_000;
    const free = freeDiskBytes();
    const diskOk = free === null || free > MIN_FREE_BYTES;
    const ok = workerOk && diskOk;
    return Response.json(
      { ok, db: "ok", worker: workerOk ? "ok" : "stale", disk: diskOk ? "ok" : "low" },
      { status: ok ? 200 : 503 },
    );
  } catch {
    return Response.json({ ok: false, db: "error" }, { status: 503 });
  }
}
