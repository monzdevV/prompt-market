"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CaretDoubleUp, CaretUp, PauseCircle, WarningCircle } from "@phosphor-icons/react";
import {
  ETIQUETA_ETAPA,
  PROBABILIDAD_POR_ETAPA,
  TONO_ETAPA,
  accionVencidaB2B,
  esEtapa,
  estadoParaEtapa,
  valorEsperado,
  type Etapa,
  type OportunidadCompleta,
} from "@/lib/b2b";
import { dinero, numero } from "@/lib/formato";
import { LogoEmpresa, Responsable } from "@/components/crm/b2b/Piezas";
import { useAccionesOportunidad, MenuOportunidad } from "./Acciones";
import { fechaCorta } from "./Piezas";

type Columnas = Record<Etapa, OportunidadCompleta[]>;

function agrupar(filas: OportunidadCompleta[], etapas: Etapa[]): Columnas {
  const c = Object.fromEntries(etapas.map((e) => [e, [] as OportunidadCompleta[]])) as Columnas;
  for (const o of filas) c[o.etapa]?.push(o);
  for (const e of etapas) c[e].sort((a, b) => a.posicion - b.posicion);
  return c;
}

/** Posición = punto medio entre las vecinas; en los extremos, una unidad más allá. */
function posicionEntre(lista: OportunidadCompleta[], i: number) {
  const antes = lista[i - 1]?.posicion;
  const despues = lista[i + 1]?.posicion;
  if (antes == null && despues == null) return 0;
  if (antes == null) return despues! - 1;
  if (despues == null) return antes + 1;
  return (antes + despues) / 2;
}

/* --------------------------------- Tarjeta -------------------------------- */

/**
 * Tarjeta: solo lo esencial para decidir de un vistazo. Qué es, con quién,
 * cuánto vale y, si hace falta, una única alerta (acción vencida en rojo,
 * prioridad alta en ámbar, urgente en rojo). Contacto, tipo, probabilidad y
 * próxima acción siguen en la vista rápida al hacer clic.
 */
function Contenido({ o }: { o: OportunidadCompleta }) {
  const cerrada = o.etapa === "ganada" || o.etapa === "perdida";
  const vencida = !cerrada && accionVencidaB2B(o);
  const urgente = !cerrada && o.prioridad === "urgente";
  const alta = !cerrada && o.prioridad === "alta";
  return (
    <>
      {/* El logo de la empresa es el ancla de color de cada tarjeta. */}
      <div className="flex items-start gap-2.5 pr-5">
        {o.empresa ? (
          <LogoEmpresa nombre={o.empresa.nombre} url={o.empresa.logo_url} tamano="md" />
        ) : (
          <span className="size-9 shrink-0 rounded-[28%] border border-dashed border-linea" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[0.875rem] font-semibold leading-snug text-tinta">{o.nombre}</p>
          <p className="mt-0.5 truncate text-xs text-tinta-2">{o.empresa?.nombre ?? "Sin empresa"}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-linea/60 pt-2.5">
        <span className={`cifra whitespace-nowrap text-lg ${o.etapa === "perdida" ? "text-tinta-2 line-through decoration-1" : "text-tinta"}`}>
          {dinero(o.valor)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {vencida && (
            <span
              className="grid size-5 place-items-center rounded-md bg-critico-suave text-critico"
              title={`Acción vencida el ${fechaCorta(o.proxima_accion_fecha)}: ${o.proxima_accion ?? "seguimiento"}`}
            >
              <WarningCircle className="size-3.5" weight="fill" aria-hidden />
              <span className="sr-only">Acción vencida el {fechaCorta(o.proxima_accion_fecha)}</span>
            </span>
          )}
          {urgente && (
            <span className="grid size-5 place-items-center rounded-md bg-critico-suave text-critico" title="Prioridad urgente">
              <CaretDoubleUp className="size-3.5" weight="bold" aria-hidden />
              <span className="sr-only">Prioridad urgente</span>
            </span>
          )}
          {alta && (
            <span className="grid size-5 place-items-center rounded-md bg-aviso-suave text-aviso" title="Prioridad alta">
              <CaretUp className="size-3.5" weight="bold" aria-hidden />
              <span className="sr-only">Prioridad alta</span>
            </span>
          )}
          {o.estado === "en_pausa" && (
            <span className="text-tinta-2" title="En pausa">
              <PauseCircle className="size-4" weight="fill" aria-hidden />
              <span className="sr-only">En pausa</span>
            </span>
          )}
          <Responsable m={o.responsable} soloAvatar />
        </span>
      </div>
    </>
  );
}

const claseTarjeta = "relative block w-full rounded-2xl bg-tarjeta px-3 py-3 text-left shadow-placa ring-1 ring-linea/70";

function Tarjeta({ o, alAbrir }: { o: OportunidadCompleta; alAbrir: (o: OportunidadCompleta) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: o.id,
    data: { etapa: o.etapa },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        aria-roledescription="tarjeta arrastrable"
        aria-label={`${o.nombre}, ${dinero(o.valor)}. Espacio para mover, clic para vista rápida.`}
        onClick={() => alAbrir(o)}
        className={`${claseTarjeta} cursor-grab transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:ring-tinta-2/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta active:cursor-grabbing`}
      >
        <Contenido o={o} />
      </div>
      <MenuOportunidad o={o} className="absolute right-1.5 top-1.5" />
    </li>
  );
}

/* --------------------------------- Columna -------------------------------- */

function Columna({
  etapa,
  items,
  alAbrir,
}: {
  etapa: Etapa;
  items: OportunidadCompleta[];
  alAbrir: (o: OportunidadCompleta) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa, data: { tipo: "columna" } });
  const valor = items.reduce((s, o) => s + o.valor, 0);
  const esperado = items.reduce((s, o) => s + valorEsperado(o), 0);

  return (
    <section
      className={`flex max-h-[75dvh] w-[288px] shrink-0 snap-start flex-col rounded-2xl transition-[background-color,box-shadow] md:max-h-none md:min-h-0 md:w-0 md:min-w-[212px] md:flex-1 ${
        isOver ? "bg-acento-suave ring-2 ring-acento/60" : "bg-columna"
      }`}
      aria-label={`${ETIQUETA_ETAPA[etapa]}: ${items.length} oportunidades, ${dinero(valor)}`}
    >
      <header className="shrink-0 px-3 pb-3 pt-3">
        <span className="mb-3 block h-1 rounded-full" style={{ backgroundColor: TONO_ETAPA[etapa] }} aria-hidden />
        <div className="flex items-baseline gap-2">
          <h2 className="truncate text-sm font-semibold text-tinta">{ETIQUETA_ETAPA[etapa]}</h2>
          <span className="text-xs font-medium tabular-nums text-tinta-2">{numero(items.length)}</span>
          <span
            className="cifra ml-auto text-base text-tinta"
            title={etapa !== "ganada" && etapa !== "perdida" && valor > 0 ? `${dinero(esperado)} esperados` : undefined}
          >
            {dinero(valor)}
          </span>
        </div>
      </header>

      <SortableContext id={etapa} items={items.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 pb-2 pt-0.5">
          {items.map((o) => (
            <Tarjeta key={o.id} o={o} alAbrir={alAbrir} />
          ))}
          {items.length === 0 && (
            <li className="grid min-h-[96px] place-items-center rounded-lg border border-dashed border-linea px-3 text-center text-[0.8125rem] text-tinta-2">
              Suelta aquí una oportunidad
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

/* --------------------------------- Kanban --------------------------------- */

export function Kanban({ filas, etapas }: { filas: OportunidadCompleta[]; etapas: Etapa[] }) {
  const { abrir, mover } = useAccionesOportunidad();
  const idDnd = useId();
  const [columnas, setColumnas] = useState(() => agrupar(filas, etapas));
  const [activa, setActiva] = useState<OportunidadCompleta | null>(null);
  const inicio = useRef<{ etapa: Etapa; indice: number; foto: Columnas } | null>(null);
  const finArrastre = useRef(0);

  // Datos nuevos del servidor sustituyen al estado optimista.
  const [origen, setOrigen] = useState({ filas, etapas });
  if (filas !== origen.filas || etapas.join() !== origen.etapas.join()) {
    setOrigen({ filas, etapas });
    setColumnas(agrupar(filas, etapas));
  }

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const porId = useMemo(() => {
    const m = new Map<string, OportunidadCompleta>();
    for (const e of etapas) for (const o of columnas[e] ?? []) m.set(o.id, o);
    return m;
  }, [columnas, etapas]);

  function columnaDe(id: UniqueIdentifier | undefined, cols = columnas): Etapa | null {
    if (id == null) return null;
    if (esEtapa(id) && cols[id]) return id;
    for (const e of etapas) if (cols[e]?.some((o) => o.id === id)) return e;
    return null;
  }

  const nombre = (id: UniqueIdentifier) => porId.get(String(id))?.nombre ?? "La oportunidad";
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `${nombre(active.id)} cogida.`,
    onDragOver: ({ active, over }) => {
      const e = columnaDe(over?.id);
      return e ? `${nombre(active.id)} sobre ${ETIQUETA_ETAPA[e]}.` : `${nombre(active.id)} fuera de las columnas.`;
    },
    onDragEnd: ({ active, over }) => {
      const e = columnaDe(over?.id);
      return e ? `${nombre(active.id)} soltada en ${ETIQUETA_ETAPA[e]}.` : `${nombre(active.id)} vuelve a su sitio.`;
    },
    onDragCancel: ({ active }) => `Movimiento cancelado. ${nombre(active.id)} vuelve a su sitio.`,
  };

  function alEmpezar({ active }: DragStartEvent) {
    const etapa = columnaDe(active.id);
    if (!etapa) return;
    inicio.current = { etapa, indice: columnas[etapa].findIndex((o) => o.id === active.id), foto: columnas };
    setActiva(porId.get(String(active.id)) ?? null);
  }

  /** Cruza de columna en vivo para que las demás tarjetas hagan hueco. */
  function alPasar({ active, over }: DragOverEvent) {
    if (!over) return;
    setColumnas((cols) => {
      const desde = columnaDe(active.id, cols);
      const hacia = columnaDe(over.id, cols);
      if (!desde || !hacia || desde === hacia) return cols;
      const origenLista = cols[desde];
      const destino = cols[hacia];
      const item = origenLista.find((o) => o.id === active.id);
      if (!item) return cols;
      const iOver = destino.findIndex((o) => o.id === over.id);
      const abajo =
        active.rect.current.translated && over.rect
          ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2
          : false;
      const indice = iOver >= 0 ? iOver + (abajo ? 1 : 0) : destino.length;
      return {
        ...cols,
        [desde]: origenLista.filter((o) => o.id !== active.id),
        [hacia]: [...destino.slice(0, indice), { ...item, etapa: hacia }, ...destino.slice(indice)],
      };
    });
  }

  function restaurar() {
    if (inicio.current) setColumnas(inicio.current.foto);
  }

  function alSoltar({ active, over }: DragEndEvent) {
    setActiva(null);
    finArrastre.current = Date.now();
    const ini = inicio.current;
    if (!ini) return;
    const etapa = columnaDe(active.id);
    if (!over || !etapa) {
      restaurar();
      return;
    }

    let lista = columnas[etapa];
    const desdeI = lista.findIndex((o) => o.id === active.id);
    const overI = lista.findIndex((o) => o.id === over.id);
    if (overI >= 0 && overI !== desdeI) lista = arrayMove(lista, desdeI, overI);
    const indice = lista.findIndex((o) => o.id === active.id);

    if (etapa === ini.etapa && indice === ini.indice) {
      restaurar();
      return;
    }

    const original = ini.foto[ini.etapa].find((o) => o.id === active.id)!;
    const posicion = posicionEntre(lista, indice);
    const cambia = etapa !== ini.etapa;
    const movida: OportunidadCompleta = {
      ...original,
      etapa,
      posicion,
      ...(cambia
        ? { probabilidad: PROBABILIDAD_POR_ETAPA[etapa], estado: estadoParaEtapa(etapa, original.estado) }
        : {}),
    };
    lista = lista.map((o) => (o.id === movida.id ? movida : o));
    const foto = ini.foto;
    setColumnas((cols) => ({ ...cols, [etapa]: lista }));

    // Persistencia: si falla (o se cancela el motivo de pérdida), vuelve todo a como estaba.
    mover(original, etapa, { posicion, alFallar: () => setColumnas(foto), silencioso: !cambia });
    inicio.current = null;
  }

  function alAbrir(o: OportunidadCompleta) {
    // El clic que sigue a soltar una tarjeta no debe abrir la vista rápida.
    if (Date.now() - finArrastre.current < 250) return;
    abrir(o);
  }

  return (
    <DndContext
      id={idDnd}
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={alEmpezar}
      onDragOver={alPasar}
      onDragEnd={alSoltar}
      onDragCancel={() => {
        setActiva(null);
        restaurar();
      }}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: {
          draggable:
            "Pulsa espacio o intro para coger la tarjeta. Usa las flechas para moverla entre posiciones y columnas, espacio o intro para soltarla y escape para cancelar.",
        },
      }}
    >
      <div
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:min-h-0 md:flex-1 md:snap-none md:overflow-y-hidden lg:-mx-8 lg:px-8"
        role="region"
        aria-label="Tablero de oportunidades"
      >
        {etapas.map((e) => (
          <Columna key={e} etapa={e} items={columnas[e] ?? []} alAbrir={alAbrir} />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        {activa ? (
          <div className={`${claseTarjeta} w-[272px] rotate-[1.5deg] cursor-grabbing shadow-xl ring-2 ring-acento`}>
            <Contenido o={activa} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
