import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUp, Minus } from "lucide-react";
import { iniciales } from "@/lib/formato";
import {
  ETIQUETA_ESTADO_EMPRESA,
  ETIQUETA_ETAPA,
  ETIQUETA_INTERACCION,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_TIPO_EMPRESA,
  ETIQUETA_TIPO_OPORTUNIDAD,
  RELLENO_ETAPA,
  TONO_INTERACCION,
  TONO_TIPO_EMPRESA,
  nombreCompleto,
  ruta,
  tonoColor,
  tonoTipoOportunidad,
  type EstadoEmpresa,
  type Etapa,
  type MiembroMini,
  type Prioridad,
  type TipoEmpresa,
  type TipoInteraccion,
  type TipoOportunidad,
} from "@/lib/b2b";

/** Piezas visuales compartidas del CRM B2B (server-safe: sin hooks). */


/**
 * Etiqueta de categoría (etapa, tipo, canal): relleno sólido, el tono llega por --tono.
 * Para estados y prioridad se usa `Senal`: color sólido del significado + icono o punto.
 */
export function Tag({ tono, children, className = "" }: { tono?: string; children: ReactNode; className?: string }) {
  return (
    <span className={`tag ${className}`} style={tono ? ({ "--tono": tono } as CSSProperties) : undefined}>
      {children}
    </span>
  );
}

/**
 * Señal de estado: color sólido del significado (rojo, ámbar, verde, azul o gris)
 * con texto blanco y su icono o punto, para que el color nunca vaya solo.
 */
const SENAL = {
  critico: "bg-[var(--relleno-rojo)]",
  aviso: "bg-[var(--relleno-ambar)]",
  exito: "bg-[var(--relleno-verde)]",
  acento: "bg-[var(--relleno-azul)]",
  neutro: "bg-[var(--relleno-gris)]",
} as const;
type Semantica = keyof typeof SENAL;

export function Senal({
  tipo,
  icono,
  children,
  className = "",
}: {
  tipo: Semantica;
  icono?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[1.375rem] items-center gap-1 whitespace-nowrap rounded-full pl-1.5 pr-2 text-xs font-semibold text-white ${SENAL[tipo]} ${className}`}
    >
      {icono ? (
        <span className="grid size-3.5 place-items-center" aria-hidden>
          {icono}
        </span>
      ) : (
        <span className="mx-0.5 size-1.5 shrink-0 rounded-full bg-white/85" aria-hidden />
      )}
      {children}
    </span>
  );
}

const TAMANO = { xs: "size-5 text-[0.6rem]", sm: "size-7 text-[0.7rem]", md: "size-9 text-xs", lg: "size-14 text-base" } as const;
type Tamano = keyof typeof TAMANO;

/** Tono estable a partir de un texto, para que cada empresa conserve su color. */
function tonoDe(texto: string) {
  // Sin verde/ámbar/rojo: esos colores son de estado, no de identidad.
  const tonos = ["azul", "violeta", "cian", "rosa", "gris"];
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `var(--relleno-${tonos[h % tonos.length]})`;
}

/** Logo de empresa: la imagen si hay, si no un monograma cuadrado con su tono. */
export function LogoEmpresa({ nombre, url, tamano = "sm" }: { nombre: string; url?: string | null; tamano?: Tamano }) {
  const clase = `${TAMANO[tamano]} shrink-0 rounded-[28%]`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${clase} logo-empresa object-contain`} />;
  }
  const letras = nombre
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-Z]/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${clase} grid place-items-center font-semibold text-sobre-relleno`}
      style={{ background: tonoDe(nombre) }}
      aria-hidden
    >
      {letras || nombre.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Avatar redondo de persona (contacto o miembro del equipo). */
export function Avatar({
  nombre,
  apellidos,
  url,
  tono,
  tamano = "sm",
}: {
  nombre: string;
  apellidos?: string | null;
  url?: string | null;
  tono?: string;
  tamano?: Tamano;
}) {
  const clase = `${TAMANO[tamano]} shrink-0 rounded-full`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${clase} logo-empresa object-contain`} />;
  }
  return (
    <span
      className={`${clase} grid place-items-center font-semibold text-sobre-relleno`}
      style={{ background: tono ?? tonoDe(`${nombre}${apellidos ?? ""}`) }}
      aria-hidden
    >
      {iniciales(nombre, apellidos)}
    </span>
  );
}

/** Responsable interno: avatar con su color y nombre (o sólo avatar). */
export function Responsable({ m, soloAvatar = false }: { m: MiembroMini | null | undefined; soloAvatar?: boolean }) {
  if (!m) return <span className="text-sm text-tinta-2">Sin asignar</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5" title={nombreCompleto(m)}>
      <Avatar nombre={m.nombre} apellidos={m.apellidos} tono={tonoColor(m.color)} tamano="xs" />
      {!soloAvatar && <span className="truncate text-sm text-tinta">{m.nombre}</span>}
    </span>
  );
}

export const BadgeEtapa = ({ etapa }: { etapa: Etapa }) => <Tag tono={RELLENO_ETAPA[etapa]}>{ETIQUETA_ETAPA[etapa]}</Tag>;

export const BadgeTipoOportunidad = ({ tipo }: { tipo: TipoOportunidad }) => (
  <Tag tono={tonoTipoOportunidad(tipo)}>{ETIQUETA_TIPO_OPORTUNIDAD[tipo]}</Tag>
);

export const BadgeTipoEmpresa = ({ tipo }: { tipo: TipoEmpresa }) => (
  <Tag tono={TONO_TIPO_EMPRESA[tipo]}>{ETIQUETA_TIPO_EMPRESA[tipo]}</Tag>
);

/** Estado de empresa: verde activa, ámbar en evaluación, rojo bloqueada, gris inactiva. */
const SEMANTICA_ESTADO_EMPRESA: Record<EstadoEmpresa, Semantica> = {
  activa: "exito",
  en_evaluacion: "aviso",
  inactiva: "neutro",
  bloqueada: "critico",
};

export const BadgeEstadoEmpresa = ({ estado }: { estado: EstadoEmpresa }) => (
  <Senal tipo={SEMANTICA_ESTADO_EMPRESA[estado] ?? "neutro"}>{ETIQUETA_ESTADO_EMPRESA[estado]}</Senal>
);

export const BadgeInteraccion = ({ tipo }: { tipo: TipoInteraccion }) => (
  <Tag tono={TONO_INTERACCION[tipo]}>{ETIQUETA_INTERACCION[tipo]}</Tag>
);

/**
 * Prioridad: escala ordinal con flecha + texto. Urgente rojo, alta ámbar,
 * media azul suave, baja gris. Sólo alta y urgente llaman la atención.
 */
const SENAL_PRIORIDAD: Record<Prioridad, { tipo: Semantica; icono: ReactNode }> = {
  urgente: { tipo: "critico", icono: <ChevronsUp className="size-3.5" strokeWidth={2.5} /> },
  alta: { tipo: "aviso", icono: <ChevronUp className="size-3.5" strokeWidth={2.5} /> },
  media: { tipo: "acento", icono: <Minus className="size-3.5" strokeWidth={2.5} /> },
  baja: { tipo: "neutro", icono: <ChevronDown className="size-3.5" strokeWidth={2.5} /> },
};

export function BadgePrioridad({ prioridad }: { prioridad: Prioridad }) {
  const s = SENAL_PRIORIDAD[prioridad] ?? SENAL_PRIORIDAD.media;
  return (
    <Senal tipo={s.tipo} icono={s.icono}>
      {ETIQUETA_PRIORIDAD[prioridad]}
    </Senal>
  );
}

/** Enlaces cruzados entre entidades: siempre se puede saltar a la ficha. */
export function EnlaceEmpresa({ e, conLogo = true }: { e: { id: string; nombre: string; logo_url?: string | null } | null; conLogo?: boolean }) {
  if (!e) return <span className="text-sm text-tinta-2">—</span>;
  return (
    <Link href={ruta.empresa(e.id)} className="inline-flex min-w-0 items-center gap-2 text-sm text-tinta hover:underline">
      {conLogo && <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" />}
      <span className="truncate">{e.nombre}</span>
    </Link>
  );
}

export function EnlaceContacto({
  c,
  conAvatar = true,
}: {
  c: { id: string; nombre: string; apellidos: string; avatar_url?: string | null } | null;
  conAvatar?: boolean;
}) {
  if (!c) return <span className="text-sm text-tinta-2">—</span>;
  return (
    <Link href={ruta.contacto(c.id)} className="inline-flex min-w-0 items-center gap-2 text-sm text-tinta hover:underline">
      {conAvatar && <Avatar nombre={c.nombre} apellidos={c.apellidos} url={c.avatar_url} tamano="xs" />}
      <span className="truncate">{nombreCompleto(c)}</span>
    </Link>
  );
}

export function EnlaceOportunidad({ o }: { o: { id: string; nombre: string } | null }) {
  if (!o) return <span className="text-sm text-tinta-2">—</span>;
  return (
    <Link href={ruta.oportunidad(o.id)} className="truncate text-sm font-medium text-tinta hover:underline">
      {o.nombre}
    </Link>
  );
}

/** Par etiqueta/valor para fichas. */
export function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-tinta-2">{etiqueta}</dt>
      <dd className="min-w-0 text-sm text-tinta">{children ?? <span className="text-tinta-2">—</span>}</dd>
    </div>
  );
}
