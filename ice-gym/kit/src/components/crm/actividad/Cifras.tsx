import type { ReactNode } from "react";
import Link from "next/link";

/** Tarjeta de cifra (server-safe). Con href, toda la tarjeta enlaza. */
export function Cifra({
  etiqueta,
  valor,
  detalle,
  icono,
  tono,
  href,
  alerta = false,
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono?: ReactNode;
  tono?: string;
  href?: string;
  alerta?: boolean;
}) {
  const cuerpo = (
    <>
      <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-tinta-2">
        {icono && (
          <span className="grid size-6 place-items-center rounded-md text-sobre-relleno" style={{ background: tono ?? "var(--relleno-gris)" }} aria-hidden>
            {icono}
          </span>
        )}
        {etiqueta}
      </span>
      <span className={`cifra text-[2rem] ${alerta ? "text-critico" : "text-tinta"}`}>{valor}</span>
      {detalle && <span className="text-xs text-tinta-2">{detalle}</span>}
    </>
  );
  const clase = "flex min-w-0 flex-col gap-1.5 rounded-2xl bg-placa p-4 shadow-placa";
  return href ? (
    <Link href={href} className={`${clase} transition-colors hover:bg-placa-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}
