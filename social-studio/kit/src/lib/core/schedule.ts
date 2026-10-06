/** Reparto de vídeos en horas fijas para programar en lote (en la hora local del navegador). */

const pad = (n: number) => String(n).padStart(2, "0");
/** Valor para <input type="datetime-local">: "2026-09-24T10:00" */
export const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** "2026-09-24" */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "10:00, 15:30 20" → ["10:00", "15:30", "20:00"] (ordenadas, sin repetir). */
export function parseSlots(text: string) {
  const out = new Set<string>();
  for (const part of text.split(/[\s,;]+/)) {
    const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(part.trim());
    if (!m) continue;
    const h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (h < 24 && min < 60) out.add(`${pad(h)}:${pad(min)}`);
  }
  return [...out].sort();
}

/** Reparte `count` vídeos en las horas del día desde `start`, saltando las que ya han pasado. */
export function assignTimes(count: number, start: string, slots: string[], now: number) {
  const out: string[] = [];
  if (!slots.length || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return out;
  const [y, m, d] = start.split("-").map(Number);
  for (let day = 0; out.length < count && day < 400; day++) {
    for (const s of slots) {
      const [h, min] = s.split(":").map(Number);
      const at = new Date(y, m - 1, d + day, h, min);
      if (at.getTime() > now + 5 * 60_000) out.push(toLocalInput(at));
      if (out.length >= count) break;
    }
  }
  return out;
}
