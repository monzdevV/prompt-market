// Código 39 real (se puede leer con un lector): cada carácter son 9 elementos, 3 anchos.
const TABLA: Record<string, string> = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000", "4": "000110001",
  "5": "100110000", "6": "001110000", "7": "000100101", "8": "100100100", "9": "001100100",
  A: "100001001", B: "001001001", C: "101001000", D: "000011001", E: "100011000",
  F: "001011000", G: "000001101", H: "100001100", I: "001001100", J: "000011100",
  K: "100000011", L: "001000011", M: "101000010", N: "000010011", O: "100010010",
  P: "001010010", Q: "000000111", R: "100000110", S: "001000110", T: "000010110",
  U: "110000001", V: "011000001", W: "111000000", X: "010010001", Y: "110010000",
  Z: "011010000", "-": "010000101", "*": "010010100",
};

export function CodigoBarras({ valor, alto = 44, className }: { valor: string; alto?: number; className?: string }) {
  const texto = `*${valor.toUpperCase().replace(/[^0-9A-Z-]/g, "")}*`;
  const barras: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of texto) {
    const patron = TABLA[ch];
    for (let i = 0; i < 9; i++) {
      const w = patron[i] === "1" ? 3 : 1;
      if (i % 2 === 0) barras.push({ x, w });
      x += w;
    }
    x += 1; // separación entre caracteres
  }
  return (
    <svg
      viewBox={`0 0 ${x} ${alto}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={`Código de barras ${valor}`}
    >
      {barras.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={alto} fill="currentColor" />
      ))}
    </svg>
  );
}
