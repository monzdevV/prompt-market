// Calcula la próxima hora de publicación (p. ej. 18:00 Europe/Madrid) como ISO UTC.
const offsetMinutes = (date, timeZone) => {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName").value; // "GMT+02:00"
  const m = part.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  return m ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +(m[3] ?? 0)) : 0;
};

export function nextSlot({ hour = 18, timeZone = "Europe/Madrid", daysAhead = 0, minLeadHours = 2 } = {}) {
  for (let d = daysAhead; d < daysAhead + 8; d++) {
    const base = new Date(Date.now() + d * 864e5);
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(base);
    const guess = new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00Z`);
    const utc = new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60000);
    if (utc.getTime() > Date.now() + minLeadHours * 36e5) return utc.toISOString();
  }
}
