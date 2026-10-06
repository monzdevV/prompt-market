"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AddressBook,
  ArrowSquareOut,
  Buildings,
  ChartBar,
  CheckSquare,
  DotsThreeOutline,
  GearSix,
  Lightning,
  SidebarSimple,
  SignOut,
  Target,
  type Icon,
} from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MARCA } from "@/marca";
import { Logotipo } from "@/components/marca/Logotipo";
import { FilaTema } from "@/components/crm/InterruptorTema";
import { salir } from "@/app/crm/acciones/sesion";

type Contador = "oportunidades" | "tareas";
export type Contadores = Record<Contador, number>;
type Seccion = { href: string; texto: string; corto?: string; Icono: Icon; contador?: Contador };

const GRUPOS: { titulo: string; secciones: Seccion[] }[] = [
  {
    titulo: "General",
    secciones: [{ href: "/crm", texto: "Dashboard", Icono: ChartBar }],
  },
  {
    titulo: "Comercial",
    secciones: [
      { href: "/crm/oportunidades", texto: "Oportunidades", corto: "Pipeline", Icono: Target, contador: "oportunidades" },
      { href: "/crm/empresas", texto: "Empresas", Icono: Buildings },
      { href: "/crm/contactos", texto: "Contactos", Icono: AddressBook },
      { href: "/crm/actividades", texto: "Actividades", Icono: Lightning },
      { href: "/crm/tareas", texto: "Tareas", Icono: CheckSquare, contador: "tareas" },
    ],
  },
];

const CONFIGURACION: Seccion = { href: "/crm/configuracion", texto: "Configuración", Icono: GearSix };
const TODAS = [...GRUPOS.flatMap((g) => g.secciones), CONFIGURACION];

/** Secciones fijas de la barra inferior en móvil; el resto va en «Más». */
const MOVIL = ["/crm", "/crm/oportunidades", "/crm/empresas", "/crm/contactos", "/crm/tareas"];

/** La sección activa es la de ruta más larga que encaja; el dashboard sólo en /crm exacto. */
function useSeccionActiva() {
  const pathname = usePathname();
  let mejor: string | null = null;
  for (const { href } of TODAS) {
    const encaja = href === "/crm" ? pathname === "/crm" : pathname === href || pathname.startsWith(`${href}/`);
    if (encaja && (!mejor || href.length > mejor.length)) mejor = href;
  }
  return mejor;
}

/** Con el menú plegado, el texto vive en un tooltip a la derecha. */
function ConPista({ texto, plegado, children }: { texto: string; plegado: boolean; children: ReactNode }) {
  if (!plegado) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}

const claseFila = "relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150";

function Enlace({
  s,
  on,
  n,
  onClick,
  plegado = false,
}: {
  s: Seccion;
  on: boolean;
  n?: number | null;
  onClick?: () => void;
  plegado?: boolean;
}) {
  const { href, texto, Icono } = s;
  const hay = n != null && n > 0;
  return (
    <ConPista texto={hay ? `${texto} · ${n}` : texto} plegado={plegado}>
      <Link
        href={href}
        onClick={onClick}
        aria-current={on ? "page" : undefined}
        aria-label={plegado ? texto : undefined}
        className={`${claseFila} ${on ? "bg-acento-suave text-tinta" : "text-tinta-2 hover:bg-placa-2 hover:text-tinta"}`}
      >
        <span className="relative grid size-5 shrink-0 place-items-center">
          <Icono className={`size-[18px] ${on ? "text-acento-tinta" : ""}`} weight={on ? "fill" : "regular"} aria-hidden />
          {hay && plegado && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-acento ring-2 ring-placa" aria-hidden />}
        </span>
        <span className="etiqueta-menu flex-1 truncate">{texto}</span>
        {hay && (
          <span
            className={`etiqueta-menu min-w-6 rounded-md px-1.5 text-center text-xs font-semibold leading-5 tabular-nums ${
              on ? "bg-acento text-sobre-campo" : "bg-placa-2 text-tinta-2"
            }`}
          >
            {n}
            <span className="sr-only"> pendientes</span>
          </span>
        )}
      </Link>
    </ConPista>
  );
}

function Grupos({
  contadores,
  activa,
  onNavegar,
  plegado = false,
}: {
  contadores: Contadores;
  activa: string | null;
  onNavegar?: () => void;
  plegado?: boolean;
}) {
  return (
    <>
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p
            className={`mb-1.5 h-4 truncate px-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-tinta-2/80 transition-opacity duration-150 ${
              plegado ? "opacity-0" : ""
            }`}
            aria-hidden={plegado}
          >
            {g.titulo}
          </p>
          <div className="flex flex-col gap-0.5">
            {g.secciones.map((s) => (
              <Enlace
                key={s.href}
                s={s}
                on={activa === s.href}
                n={s.contador ? contadores[s.contador] : null}
                onClick={onNavegar}
                plegado={plegado}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

const COOKIE_MENU = "crm-menu";
const guardarMenu = (plegado: boolean) => {
  document.cookie = `${COOKIE_MENU}=${plegado ? "plegado" : "abierto"}; path=/; max-age=31536000; samesite=lax`;
};

/**
 * Menú lateral de escritorio: logotipo arriba, secciones y, abajo, ajustes,
 * modo oscuro y la sesión. Se pliega a una columna de iconos con el botón de
 * arriba o con Ctrl/⌘ + B, y lo recuerda en una cookie para que el servidor
 * lo pinte ya plegado (sin salto al cargar).
 */
export function BarraLateral({
  contadores,
  plegadoInicial,
  nombre,
  email,
}: {
  contadores: Contadores;
  plegadoInicial: boolean;
  nombre: string;
  email: string;
}) {
  const activa = useSeccionActiva();
  const [plegado, setPlegado] = useState(plegadoInicial);

  function cambiar(siguiente: boolean) {
    setPlegado(siguiente);
    guardarMenu(siguiente);
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "b") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      setPlegado((p) => {
        guardarMenu(!p);
        return !p;
      });
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const textoBoton = plegado ? "Desplegar menú" : "Plegar menú";

  return (
    <aside data-plegado={plegado || undefined} className="menu-lateral sticky top-0 hidden h-dvh shrink-0 flex-col bg-placa py-4 md:flex">
      <div className="cabeza-menu mb-7 flex items-center gap-2 px-3">
        <Link
          href="/crm"
          aria-label={`${MARCA.nombre}, ir al dashboard`}
          className="etiqueta-menu flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 pl-2.5"
        >
          <Logotipo className="text-[1.65rem]" />
          <span className="rounded bg-placa-2 px-1.5 py-[3px] text-[0.62rem] font-bold uppercase leading-none tracking-[0.1em] text-tinta-2">
            CRM
          </span>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => cambiar(!plegado)}
              aria-label={textoBoton}
              aria-expanded={!plegado}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-tinta-2 transition-[background-color,color,transform] duration-150 hover:bg-placa-2 hover:text-tinta active:scale-[0.96]"
            >
              <SidebarSimple className="size-[19px]" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {textoBoton}
            <kbd className="ml-1.5 font-sans text-[0.68rem] opacity-60">Ctrl B</kbd>
          </TooltipContent>
        </Tooltip>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden px-3 pb-3" aria-label="Secciones del CRM">
        <Grupos contadores={contadores} activa={activa} plegado={plegado} />
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 px-3 pt-3">
        <Enlace s={CONFIGURACION} on={activa === CONFIGURACION.href} plegado={plegado} />
        <ConPista texto="Web pública" plegado={plegado}>
          <Link
            href="/"
            aria-label={plegado ? "Web pública" : undefined}
            className={`${claseFila} text-tinta-2 hover:bg-placa-2 hover:text-tinta`}
          >
            <span className="grid size-5 shrink-0 place-items-center">
              <ArrowSquareOut className="size-[18px]" aria-hidden />
            </span>
            <span className="etiqueta-menu flex-1 truncate">Web pública</span>
          </Link>
        </ConPista>
        <FilaTema plegado={plegado} />

        <div className="usuario-menu mt-3 flex items-center gap-3 rounded-xl bg-fondo p-1.5 pl-2">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-acento text-xs font-bold uppercase text-sobre-campo"
            title={email}
            aria-hidden
          >
            {nombre.slice(0, 2)}
          </span>
          <span className="etiqueta-menu flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-tinta">{nombre}</span>
            <span className="truncate text-xs text-tinta-2">{email}</span>
          </span>
          <form action={salir} className="etiqueta-menu">
            <button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="grid size-8 place-items-center rounded-lg text-tinta-2 transition-colors hover:bg-critico-suave hover:text-critico"
            >
              <SignOut className="size-[18px]" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Título de la sección actual para la barra superior (móvil). */
export function TituloSeccion() {
  const activa = useSeccionActiva();
  const seccion = TODAS.find((s) => s.href === activa);
  if (!seccion) return null;
  const { Icono, texto } = seccion;
  return (
    <span className="flex items-center gap-2 text-sm font-medium text-tinta">
      <Icono className="size-[18px] text-tinta-2" aria-hidden />
      {texto}
    </span>
  );
}

function PestanaMovil({ Icono, texto, on, n }: { Icono: Icon; texto: string; on: boolean; n?: number | null }) {
  return (
    <>
      {on && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-acento" aria-hidden />}
      <span className="relative">
        <Icono className="size-[22px]" weight={on ? "fill" : "regular"} aria-hidden />
        {n != null && n > 0 && (
          <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-acento px-1 text-center text-[0.6rem] font-semibold leading-4 tabular-nums text-sobre-campo">
            {n > 99 ? "99+" : n}
          </span>
        )}
      </span>
      <span className="max-w-full truncate px-0.5 text-[0.68rem] font-medium">{texto}</span>
    </>
  );
}

/** Barra inferior en móvil: cinco secciones y «Más» con el resto en una hoja. */
export function NavegacionInferior({ contadores }: { contadores: Contadores }) {
  const activa = useSeccionActiva();
  const [mas, setMas] = useState(false);
  const fijas = MOVIL.map((h) => TODAS.find((s) => s.href === h)!);
  const enMas = activa != null && !MOVIL.includes(activa);
  const clase = "relative flex min-w-0 flex-col items-center gap-1 pb-2.5 pt-3";

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-linea bg-placa pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Secciones del CRM"
      >
        {fijas.map((s) => {
          const on = activa === s.href;
          return (
            <Link key={s.href} href={s.href} aria-current={on ? "page" : undefined} className={`${clase} ${on ? "text-tinta" : "text-tinta-2"}`}>
              <PestanaMovil Icono={s.Icono} texto={s.corto ?? s.texto} on={on} n={s.contador ? contadores[s.contador] : null} />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMas(true)}
          aria-haspopup="dialog"
          aria-expanded={mas}
          className={`${clase} ${enMas ? "text-tinta" : "text-tinta-2"}`}
        >
          <PestanaMovil Icono={DotsThreeOutline} texto="Más" on={enMas} />
        </button>
      </nav>

      <Sheet open={mas} onOpenChange={setMas}>
        <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl border-linea bg-placa pb-[env(safe-area-inset-bottom)] text-tinta">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-tinta">Todas las secciones</SheetTitle>
            <SheetDescription className="sr-only">Navegación completa del CRM</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-4 px-4 pb-4" aria-label="Todas las secciones">
            <Grupos contadores={contadores} activa={activa} onNavegar={() => setMas(false)} />
            <div className="flex flex-col gap-0.5 border-t border-linea pt-3">
              <Enlace s={CONFIGURACION} on={activa === CONFIGURACION.href} onClick={() => setMas(false)} />
              <Link
                href="/"
                className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-tinta-2 hover:bg-placa-2/60 hover:text-tinta"
              >
                <ArrowSquareOut className="size-[18px]" aria-hidden />
                Web pública
              </Link>
              <FilaTema />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
