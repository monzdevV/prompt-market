import { MARCA } from "@/marca";

/**
 * Logotipo de la marca (MARCA.logo): la primera parte en la tinta y la segunda
 * en el acento, en la condensada gruesa del sistema. `sobrePlaca` es la versión
 * para ir encima de una placa invertida: la segunda parte pasa a un campo de
 * acento con texto negro, legible en ambos temas.
 */
const [PARTE_1, PARTE_2] = MARCA.logo;
export function Logotipo({
  variante = "linea",
  sobrePlaca = false,
  className = "",
}: {
  variante?: "linea" | "apilado";
  sobrePlaca?: boolean;
  className?: string;
}) {
  const ice = sobrePlaca ? "text-fondo" : "text-tinta";

  if (variante === "apilado") {
    return (
      <span className={`inline-flex flex-col items-start leading-none ${className}`} aria-label={MARCA.nombre}>
        <span className={`cifra text-[2.6em] ${ice}`}>{PARTE_1}</span>
        {sobrePlaca ? (
          <span className="corte-d cifra mt-[0.12em] bg-acento py-[0.12em] pl-[0.3em] pr-[0.9em] text-[1.3em] tracking-[0.2em] text-sobre-campo">
            {PARTE_2}
          </span>
        ) : (
          <span className="mt-[0.08em] flex w-full items-center gap-[0.3em]">
            <span className="h-[0.12em] w-[0.6em] bg-acento-tinta" aria-hidden />
            <span className="cifra text-[1.3em] tracking-[0.2em] text-acento-tinta">{PARTE_2}</span>
            <span className="h-[0.12em] flex-1 bg-acento-tinta" aria-hidden />
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline gap-[0.22em] leading-none ${className}`} aria-label={MARCA.nombre}>
      <span className={`cifra ${ice}`}>{PARTE_1}</span>
      <span className={`cifra tracking-[0.12em] ${sobrePlaca ? "text-acento" : "text-[var(--marca-gym,var(--acento-tinta))]"}`}>{PARTE_2}</span>
    </span>
  );
}
