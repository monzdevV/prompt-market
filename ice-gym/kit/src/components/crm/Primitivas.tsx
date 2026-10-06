import type { ReactNode } from "react";
import { ETIQUETA_SOCIO, type EstadoSocio } from "@/lib/tipos";

/**
 * Cabecera de pantalla como rótulo de retransmisión: una franja azul y la
 * placa del título con el corte inclinado. Sin antetítulos: el título manda.
 */
export function Encabezado({
  titulo,
  meta,
  children,
  className = "px-4 lg:px-8",
}: {
  titulo: string;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-5 pt-6 ${className}`}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="rotulo text-[2rem] text-tinta">{titulo}</h1>
        {meta && <div className="text-sm text-tinta-2">{meta}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}

/**
 * Sección en placa: se separa del suelo por tono y una sombra suave, sin bordes.
 * La cabecera no lleva regla: el espacio basta para distinguirla del contenido.
 */
export function Seccion({
  titulo,
  extra,
  children,
  className = "",
  id,
}: {
  titulo: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl bg-placa shadow-placa ${className}`}
      aria-labelledby={id}
    >
      <header className="flex items-center gap-3 px-5 pb-1 pt-4">
        <h2 id={id} className="text-sm font-semibold text-tinta">
          {titulo}
        </h2>
        <div className="ml-auto flex items-center gap-3">{extra}</div>
      </header>
      <div className="min-h-0 flex-1 px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

/** Estado del socio: punto de color + texto. Verde = activo; el impago va en rojo suave. */
export function EstadoSocioMarca({ estado }: { estado: EstadoSocio }) {
  if (estado === "impago") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-critico-suave px-2 py-0.5 text-xs font-semibold text-critico">
        <span className="size-1.5 shrink-0 rounded-full bg-critico" aria-hidden />
        {ETIQUETA_SOCIO.impago}
      </span>
    );
  }

  const marca = estado === "activo" ? "bg-exito" : estado === "congelado" ? "bg-acento-tinta" : "bg-apagado";
  const fondo = estado === "activo" ? "bg-exito-suave" : estado === "congelado" ? "bg-acento-suave" : "bg-placa-2";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${fondo} ${
        estado === "baja" ? "text-tinta-2" : "text-tinta"
      }`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${marca}`} aria-hidden />
      {ETIQUETA_SOCIO[estado]}
    </span>
  );
}

/** Pantalla vacía: dice qué falta y qué hacer, sin disculparse. */
export function SinDatos({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-1 py-10">
      <p className="text-base font-semibold text-tinta">{titulo}</p>
      <p className="max-w-md text-sm leading-relaxed text-tinta-2">{texto}</p>
      {accion}
    </div>
  );
}

/** Botón de texto con subrayado: la acción secundaria por defecto. */
export const claseEnlace =
  "text-sm font-medium text-acento-tinta underline-offset-4 transition-colors hover:underline";

/** Botón principal. */
export const claseBotonPrincipal =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-acento px-4 text-sm font-semibold text-sobre-campo transition-[background-color,transform] duration-150 ease-out hover:bg-acento/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

/** Campo de formulario. */
export const claseCampo =
  "h-9 w-full rounded-lg border border-linea bg-placa px-3 text-sm text-tinta outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tinta-2 focus:border-acento focus:ring-3 focus:ring-acento/30 aria-invalid:border-critico aria-invalid:ring-critico/20";

/** Error de formulario. */
export const claseError =
  "rounded-lg bg-critico-suave px-3 py-2 text-sm font-semibold text-critico";
