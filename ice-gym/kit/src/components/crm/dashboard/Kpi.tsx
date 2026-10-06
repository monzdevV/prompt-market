import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle, WarningCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Variacion } from "./Graficos";

/** Minigráfico de área en SVG: sólo la forma de la tendencia, sin ejes. */
function Tendencia({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * 100, 30 - ((v - min) / rango) * 26] as const);
  const linea = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const [ux, uy] = pts.at(-1)!;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-9 w-full overflow-visible" aria-hidden>
      <polygon points={`0,32 ${linea} 100,32`} fill="var(--serie-1)" opacity="0.1" />
      <polyline
        points={linea}
        fill="none"
        stroke="var(--serie-1)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={ux} cy={uy} r="2.5" fill="var(--serie-1)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Cifra principal del resumen: qué es, cuánto, cómo va frente al mes pasado
 * y su tendencia. Toda la cifra lleva a su sección.
 */
export function Metrica({
  etiqueta,
  valor,
  pie,
  href,
  delta,
  deltaBueno = "sube",
  serie,
}: {
  etiqueta: string;
  valor: ReactNode;
  pie: ReactNode;
  href: string;
  delta?: number | null;
  deltaBueno?: "sube" | "baja";
  serie?: number[];
}) {
  const hayDelta = delta != null && Number.isFinite(delta) && Math.round(delta) !== 0;
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-2 rounded-xl p-4 transition-colors duration-150 hover:bg-placa-2/60 sm:p-5"
    >
      <span className="text-[0.8125rem] font-medium text-tinta-2 transition-colors group-hover:text-tinta">{etiqueta}</span>
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="cifra text-[2.6rem] text-tinta">{valor}</span>
        {hayDelta && <Variacion delta={delta!} bueno={deltaBueno} />}
      </span>
      <span className="text-[0.8125rem] text-tinta-2">{pie}</span>
      {serie && (
        <span className="mt-auto pt-2">
          <Tendencia valores={serie} />
        </span>
      )}
    </Link>
  );
}

/** El resumen: varias cifras en una sola placa, separadas por aire, no por cajas. */
export function Resumen({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Indicadores principales"
      className="grid grid-cols-1 gap-1 rounded-2xl bg-placa p-1.5 shadow-placa sm:grid-cols-2 xl:grid-cols-4"
    >
      {children}
    </section>
  );
}

type Nivel = "error" | "aviso" | "ok";
const NIVEL: Record<Nivel, { Icono: Icon; caja: string; icono: string }> = {
  error: { Icono: WarningCircle, caja: "bg-critico-suave", icono: "text-critico" },
  aviso: { Icono: Warning, caja: "bg-aviso-suave", icono: "text-aviso" },
  ok: { Icono: CheckCircle, caja: "bg-exito-suave", icono: "text-exito" },
};

/**
 * Lo que pide atención: rojo si hay algo vencido, ámbar si hay algo pendiente,
 * verde si está todo al día. Siempre con icono y texto, nunca sólo color.
 */
export function Atencion({
  nivel,
  titulo,
  valor,
  texto,
  href,
}: {
  nivel: Nivel;
  titulo: string;
  valor: ReactNode;
  texto: string;
  href: string;
}) {
  const { Icono, caja, icono } = NIVEL[nivel];
  return (
    <Link
      href={href}
      className={`group flex min-w-0 items-center gap-3.5 rounded-xl px-4 py-3.5 transition-[filter,transform] duration-150 hover:brightness-[0.98] active:scale-[0.99] ${caja}`}
    >
      <Icono className={`size-6 shrink-0 ${icono}`} weight="fill" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[0.8125rem] font-medium text-tinta">{titulo}</span>
        <span className="truncate text-xs text-tinta-2">{texto}</span>
      </span>
      <span className={`cifra text-3xl ${nivel === "ok" ? "text-tinta" : icono}`}>{valor}</span>
    </Link>
  );
}

/** Dato secundario: etiqueta y cifra en línea, sin caja propia. */
export function MiniDato({ etiqueta, valor, pie, href }: { etiqueta: string; valor: ReactNode; pie?: string; href: string }) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors hover:bg-placa-2/60">
      <span className="text-xs text-tinta-2 transition-colors group-hover:text-tinta">{etiqueta}</span>
      <span className="cifra text-2xl text-tinta">{valor}</span>
      {pie && <span className="truncate text-xs text-tinta-2">{pie}</span>}
    </Link>
  );
}

/** Tarjeta de sección del panel: superficie propia, sin borde. */
export function Tarjeta({
  titulo,
  subtitulo,
  extra,
  children,
  className = "",
}: {
  titulo: string;
  subtitulo?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl bg-placa shadow-placa ${className}`}>
      <header className="flex items-start gap-3 px-5 pb-1 pt-4">
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-tinta">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-[0.8125rem] text-tinta-2">{subtitulo}</p>}
        </div>
        {extra && <div className="ml-auto shrink-0">{extra}</div>}
      </header>
      <div className="min-h-0 flex-1 px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}
