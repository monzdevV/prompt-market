// Sustituto de scripts/to-vertical.py para tests: mismo contrato (ORIGEN DESTINO → una línea JSON).
// Si el origen contiene "romper", falla como lo haría la conversión real.
const fs = require("node:fs");

const [src, dst] = process.argv.slice(2);
const data = fs.readFileSync(src);
if (data.includes("romper")) {
  console.log(JSON.stringify({ ok: false, error: "ValueError: vídeo dañado" }));
  process.exit(1);
}
fs.writeFileSync(dst, Buffer.concat([Buffer.from("vertical:"), data]));
console.log(JSON.stringify({ ok: true, width: 1080, height: 1920, duration: 12.5 }));
