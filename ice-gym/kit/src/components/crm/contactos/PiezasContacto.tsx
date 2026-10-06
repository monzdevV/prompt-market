import { Star } from "@phosphor-icons/react/dist/ssr";
import { Tag } from "@/components/crm/b2b/Piezas";
import {
  ETIQUETA_ESTADO_CONTACTO,
  ETIQUETA_INTERACCION,
  ETIQUETA_TIPO_CONTACTO,
  type EstadoContacto,
  type TipoContacto,
  type TipoInteraccion,
} from "@/lib/b2b";
import { relativo } from "@/lib/formato";

/** Piezas visuales de contactos (server-safe). */

const TONO_TIPO_CONTACTO: Record<TipoContacto, string> = {
  decisor: "var(--relleno-violeta)",
  direccion: "var(--relleno-violeta)",
  comercial: "var(--relleno-verde)",
  compras: "var(--relleno-azul)",
  tecnico: "var(--relleno-ambar)",
  financiero: "var(--relleno-rosa)",
  operaciones: "var(--relleno-azul)",
  otro: "var(--relleno-gris)",
};

export const BadgeTipoContacto = ({ tipo }: { tipo: TipoContacto }) => (
  <Tag tono={TONO_TIPO_CONTACTO[tipo]}>{ETIQUETA_TIPO_CONTACTO[tipo]}</Tag>
);

export function EstadoContactoMarca({ estado }: { estado: EstadoContacto }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${estado === "activo" ? "text-tinta" : "text-tinta-2"}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${estado === "activo" ? "bg-exito" : "bg-apagado"}`} aria-hidden />
      {ETIQUETA_ESTADO_CONTACTO[estado]}
    </span>
  );
}

export function MarcaPrincipal({ conTexto = false }: { conTexto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-acento-tinta" title="Contacto principal de la empresa">
      <Star className="size-3.5" weight="fill" aria-hidden />
      {conTexto ? "Principal" : <span className="sr-only">Principal</span>}
    </span>
  );
}

const diasDesde = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000;

export function UltimaActividad({ u }: { u: { fecha: string; tipo: TipoInteraccion } | null }) {
  if (!u) return <span className="text-sm text-tinta-2">Sin actividad</span>;
  const dias = diasDesde(u.fecha);
  return (
    <span className="flex flex-col text-sm leading-tight" title={new Date(u.fecha).toLocaleString("es-ES")}>
      <span className={`tabular-nums ${dias > 60 ? "text-tinta-2" : "text-tinta"}`}>{relativo(u.fecha)}</span>
      <span className="text-xs text-tinta-2">{ETIQUETA_INTERACCION[u.tipo]}</span>
    </span>
  );
}
