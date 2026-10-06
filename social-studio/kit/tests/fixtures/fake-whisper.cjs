// Sustituto de scripts/transcribe.py para tests: mismo protocolo JSON por stdin/stdout.
// El "modelo" (segundo argumento) elige el comportamiento.
const readline = require("node:readline");

const mode = process.argv[2];
const emit = (o) => process.stdout.write(JSON.stringify(o) + "\n");

if (mode === "missing") process.exit(3);
if (mode !== "never-ready") emit({ ready: true });

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const req = JSON.parse(line);
  if (mode === "crash") process.exit(1);
  // Un vídeo "colgado" nunca responde; el resto sí
  if (req.path.includes("cuelga")) return;
  if (req.path.includes("roto")) return emit({ id: req.id, ok: false, error: "ValueError: formato no válido" });
  emit({ id: req.id, ok: true, text: `texto de ${req.path}`, language: "es", duration: 12.5 });
});
