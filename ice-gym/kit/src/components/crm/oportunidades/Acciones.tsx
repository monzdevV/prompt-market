"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOut,
  ArrowsLeftRight,
  ChatCircleDots,
  CheckSquare,
  DotsThree,
  Eye,
  Trophy,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { moverOportunidad } from "@/app/crm/acciones/b2b";
import { cambiarEtapa, marcarPerdida } from "@/app/crm/acciones/oportunidades";
import {
  ETAPAS,
  ETIQUETA_ETAPA,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_ORIGEN_B2B,
  TONO_ETAPA,
  nombreCompleto,
  ruta,
  valorEsperado,
  type Etapa,
  type OportunidadCompleta,
  type TipoInteraccion,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { dinero, fecha } from "@/lib/formato";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import {
  BadgeEtapa,
  BadgePrioridad,
  BadgeTipoOportunidad,
  Dato,
  EnlaceContacto,
  EnlaceEmpresa,
  Responsable,
} from "@/components/crm/b2b/Piezas";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { Probabilidad, ProximaAccion, fechaCorta } from "./Piezas";

/* ------------------------------------------------------------------------ */
/* Contexto: cualquier tarjeta, fila o ficha puede mover, cerrar o anotar.   */
/* ------------------------------------------------------------------------ */

type OpcionesMover = { posicion?: number; alFallar?: () => void; silencioso?: boolean };

type Ctx = {
  abrir: (o: OportunidadCompleta) => void;
  mover: (o: OportunidadCompleta, etapa: Etapa, opciones?: OpcionesMover) => void;
  registrar: (o: OportunidadCompleta, tipo?: TipoInteraccion) => void;
  pendiente: boolean;
};

const Contexto = createContext<Ctx | null>(null);

export function useAccionesOportunidad() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useAccionesOportunidad fuera de <ProveedorAcciones>");
  return c;
}

type Perdida = { o: OportunidadCompleta; posicion?: number; alFallar?: () => void };

export function ProveedorAcciones({ catalogos, children }: { catalogos: Catalogos; children: ReactNode }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [perdida, setPerdida] = useState<Perdida | null>(null);
  const [rapida, setRapida] = useState<OportunidadCompleta | null>(null);
  const [anotar, setAnotar] = useState<{ o: OportunidadCompleta; tipo?: TipoInteraccion; n: number } | null>(null);

  function mover(o: OportunidadCompleta, etapa: Etapa, { posicion, alFallar, silencioso }: OpcionesMover = {}) {
    if (etapa === "perdida" && o.etapa !== "perdida") {
      setPerdida({ o, posicion, alFallar });
      return;
    }
    empezar(async () => {
      const r = posicion == null ? await cambiarEtapa(o.id, etapa) : await moverOportunidad(o.id, etapa, posicion);
      if (r.ok) {
        if (!silencioso) {
          if (etapa === "ganada" && o.etapa !== "ganada") toast.success(`${o.nombre}: ¡ganada!`);
          else toast.success(`${o.nombre} → ${ETIQUETA_ETAPA[etapa]}`);
        }
        router.refresh();
      } else {
        alFallar?.();
        toast.error(r.mensaje);
      }
    });
  }

  const valor: Ctx = {
    abrir: setRapida,
    mover,
    registrar: (o, tipo) => setAnotar((a) => ({ o, tipo, n: (a?.n ?? 0) + 1 })),
    pendiente,
  };

  return (
    <Contexto.Provider value={valor}>
      {children}

      <DialogoPerdida
        perdida={perdida}
        onCerrar={(confirmada) => {
          if (!confirmada) perdida?.alFallar?.();
          setPerdida(null);
        }}
      />

      <VistaRapida o={rapida} onCerrar={() => setRapida(null)} catalogos={catalogos} />

      {anotar && (
        <AbrirInteraccion
          key={`${anotar.o.id}-${anotar.n}`}
          catalogos={catalogos}
          o={anotar.o}
          tipo={anotar.tipo}
        />
      )}
    </Contexto.Provider>
  );
}

/** Monta NuevaInteraccion con un disparador oculto y lo pulsa: así se abre desde un menú. */
function AbrirInteraccion({ catalogos, o, tipo }: { catalogos: Catalogos; o: OportunidadCompleta; tipo?: TipoInteraccion }) {
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Un fotograma de margen: deja que el menú termine de cerrarse y devolver el foco.
    const f = requestAnimationFrame(() => boton.current?.click());
    return () => cancelAnimationFrame(f);
  }, []);
  return (
    <NuevaInteraccion
      catalogos={catalogos}
      oportunidadId={o.id}
      empresaId={o.empresa_id ?? undefined}
      contactoId={o.contacto_id ?? undefined}
      tipo={tipo}
    >
      <button ref={boton} type="button" className="sr-only" tabIndex={-1} aria-hidden>
        Registrar actividad
      </button>
    </NuevaInteraccion>
  );
}

/* ----------------------------- Motivo de pérdida ----------------------------- */

const MOTIVOS = ["Precio", "Eligió a la competencia", "Sin presupuesto", "Sin respuesta", "No es el momento", "No encaja"];

function DialogoPerdida({ perdida, onCerrar }: { perdida: Perdida | null; onCerrar: (confirmada: boolean) => void }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [pendiente, empezar] = useTransition();
  const [abiertaPara, setAbiertaPara] = useState<string | null>(null);
  if ((perdida?.o.id ?? null) !== abiertaPara) {
    setAbiertaPara(perdida?.o.id ?? null);
    setMotivo(perdida?.o.motivo_perdida ?? "");
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!perdida) return;
    const { o, posicion } = perdida;
    empezar(async () => {
      const r = await marcarPerdida(o.id, motivo, posicion);
      if (r.ok) {
        toast.success(`${o.nombre} marcada como perdida`);
        onCerrar(true);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <Dialog open={!!perdida} onOpenChange={(v) => !v && !pendiente && onCerrar(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Por qué se ha perdido?</DialogTitle>
          <DialogDescription>
            {perdida?.o.nombre}. El motivo queda en la ficha y en la línea temporal para aprender de ello.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={confirmar} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Motivos frecuentes">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                aria-pressed={motivo === m}
                className={`h-7 rounded-full border px-2.5 text-xs transition-colors ${
                  motivo === m ? "border-acento bg-acento/10 text-acento-tinta" : "border-linea text-tinta-2 hover:text-tinta"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-tinta">Motivo</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              required
              minLength={2}
              maxLength={500}
              autoFocus
              placeholder="p. ej. Se quedaron con otro proveedor por precio"
              className={`${claseCampo} h-auto py-2`}
            />
          </label>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onCerrar(false)}
              disabled={pendiente}
              className="h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2"
            >
              Cancelar
            </button>
            <button type="submit" disabled={pendiente || motivo.trim().length < 2} className={claseBotonPrincipal}>
              {pendiente ? "Guardando…" : "Marcar perdida"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Vista rápida --------------------------------- */

function VistaRapida({
  o,
  onCerrar,
  catalogos,
}: {
  o: OportunidadCompleta | null;
  onCerrar: () => void;
  catalogos: Catalogos;
}) {
  // Conserva la última para que el contenido no desaparezca durante la animación de cierre.
  const [ultima, setUltima] = useState(o);
  if (o && o !== ultima) setUltima(o);
  const v = o ?? ultima;

  return (
    <Sheet open={!!o} onOpenChange={(abierta) => !abierta && onCerrar()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {v && (
          <>
            <SheetHeader className="gap-2 border-b border-linea pr-12">
              <div className="flex flex-wrap items-center gap-1.5">
                <BadgeEtapa etapa={v.etapa} />
                <BadgeTipoOportunidad tipo={v.tipo} />
                <BadgePrioridad prioridad={v.prioridad} />
              </div>
              <SheetTitle className="text-lg leading-snug">{v.nombre}</SheetTitle>
              <SheetDescription className="flex items-baseline gap-3">
                <span className="text-xl font-semibold tabular-nums text-tinta">{dinero(v.valor)}</span>
                <span className="tabular-nums">{dinero(valorEsperado(v))} esperados</span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 p-4">
              <Probabilidad o={v} ancho="w-full" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <Dato etiqueta="Empresa">
                  <EnlaceEmpresa e={v.empresa} />
                </Dato>
                <Dato etiqueta="Contacto">
                  <EnlaceContacto c={v.contacto} />
                </Dato>
                <Dato etiqueta="Responsable">
                  <Responsable m={v.responsable} />
                </Dato>
                <Dato etiqueta="Estado">{ETIQUETA_ESTADO_OPORTUNIDAD[v.estado]}</Dato>
                <Dato etiqueta="Cierre estimado">{v.fecha_cierre ? fecha(v.fecha_cierre) : null}</Dato>
                <Dato etiqueta="Origen">{ETIQUETA_ORIGEN_B2B[v.origen]}</Dato>
                <Dato etiqueta="Creada">{fechaCorta(v.created_at)}</Dato>
                {v.contacto?.cargo && <Dato etiqueta="Cargo">{v.contacto.cargo}</Dato>}
              </dl>

              <div className="rounded-lg border border-linea bg-placa-2/40 p-3">
                <p className="mb-1.5 text-xs font-medium text-tinta-2">Próxima acción</p>
                <ProximaAccion o={v} />
              </div>

              {v.necesidad && (
                <div>
                  <p className="mb-1 text-xs font-medium text-tinta-2">Necesidad detectada</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-tinta">{v.necesidad}</p>
                </div>
              )}
              {v.descripcion && (
                <div>
                  <p className="mb-1 text-xs font-medium text-tinta-2">Descripción</p>
                  <p className="line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-tinta">{v.descripcion}</p>
                </div>
              )}
              {v.etapa === "perdida" && v.motivo_perdida && (
                <div className="rounded-lg border border-alarma/30 bg-alarma/10 p-3 text-sm text-alarma-tinta">
                  <span className="font-medium">Motivo de pérdida:</span> {v.motivo_perdida}
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-linea pt-4">
                <Link href={ruta.oportunidad(v.id)} className={`${claseBotonPrincipal} flex-1`}>
                  <ArrowSquareOut className="size-4" aria-hidden />
                  Abrir ficha completa
                </Link>
                <NuevaInteraccion
                  catalogos={catalogos}
                  oportunidadId={v.id}
                  empresaId={v.empresa_id ?? undefined}
                  contactoId={v.contacto_id ?? undefined}
                >
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-linea px-3 text-sm font-medium text-tinta hover:bg-placa-2"
                  >
                    <ChatCircleDots className="size-4" aria-hidden />
                    Registrar actividad
                  </button>
                </NuevaInteraccion>
              </div>
              {v.contacto && (
                <p className="text-xs text-tinta-2">
                  Contacto principal: {nombreCompleto(v.contacto)}
                  {v.contacto.email && (
                    <>
                      {" · "}
                      <a href={`mailto:${v.contacto.email}`} className="text-acento-tinta hover:underline">
                        {v.contacto.email}
                      </a>
                    </>
                  )}
                  {v.contacto.telefono && (
                    <>
                      {" · "}
                      <a href={`tel:${v.contacto.telefono.replace(/\s/g, "")}`} className="text-acento-tinta hover:underline">
                        {v.contacto.telefono}
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------- Menú contextual ------------------------------- */

export function MenuOportunidad({
  o,
  className = "",
  conVistaRapida = true,
}: {
  o: OportunidadCompleta;
  className?: string;
  conVistaRapida?: boolean;
}) {
  const { abrir, mover, registrar } = useAccionesOportunidad();
  const cerrada = o.etapa === "ganada" || o.etapa === "perdida";
  // Que el puntero o el teclado sobre el botón no empiecen un arrastre en el Kanban.
  const parar = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${o.nombre}`}
          onPointerDown={parar}
          onKeyDown={parar}
          onClick={parar}
          className={`grid size-7 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento ${className}`}
        >
          <DotsThree className="size-5" weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={parar}>
        {conVistaRapida && (
          <DropdownMenuItem onSelect={() => abrir(o)}>
            <Eye aria-hidden /> Vista rápida
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={ruta.oportunidad(o.id)}>
            <ArrowSquareOut aria-hidden /> Abrir ficha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowsLeftRight aria-hidden /> Mover a etapa
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ETAPAS.map((e) => (
              <DropdownMenuItem key={e} disabled={e === o.etapa} onSelect={() => mover(o, e)}>
                <span className="size-2 rounded-full" style={{ background: TONO_ETAPA[e] }} aria-hidden />
                {ETIQUETA_ETAPA[e]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {!cerrada && (
          <>
            <DropdownMenuItem onSelect={() => mover(o, "ganada")}>
              <Trophy aria-hidden /> Marcar ganada
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => mover(o, "perdida")}>
              <XCircle aria-hidden /> Marcar perdida
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => registrar(o)}>
          <ChatCircleDots aria-hidden /> Registrar actividad
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => registrar(o, "tarea")}>
          <CheckSquare aria-hidden /> Nueva tarea
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
