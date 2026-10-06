"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Buildings,
  Copy,
  DotsThree,
  EnvelopeSimple,
  PhoneOutgoing,
  Phone,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NuevaOportunidad } from "@/components/crm/oportunidades/NuevaOportunidad";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { nombreCompleto, ruta, type TipoInteraccion } from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";

/**
 * Los diálogos de «Nueva oportunidad» y «Registrar actividad» se montan una sola vez
 * para toda la lista: el menú de cada fila sólo dice para quién y qué abrir.
 */

type Objetivo = { id: string; empresaId: string | null; accion: "oportunidad" | TipoInteraccion };
type Abrir = (o: Objetivo) => void;

const Contexto = createContext<Abrir | null>(null);

export function ProveedorAcciones({ catalogos, children }: { catalogos: Catalogos; children: React.ReactNode }) {
  const [objetivo, setObjetivo] = useState<(Objetivo & { vez: number }) | null>(null);
  const disparador = useRef<HTMLButtonElement>(null);

  const abrir = useCallback<Abrir>((o) => setObjetivo((p) => ({ ...o, vez: (p?.vez ?? 0) + 1 })), []);

  // Tras montar el diálogo con los datos de la fila, se abre pulsando su disparador oculto.
  // El retardo deja que el menú desplegable termine de cerrarse y devolver el foco.
  useEffect(() => {
    if (!objetivo) return;
    const t = setTimeout(() => disparador.current?.click(), 30);
    return () => clearTimeout(t);
  }, [objetivo]);

  const oculto = (
    <button ref={disparador} type="button" tabIndex={-1} aria-hidden className="sr-only">
      Abrir
    </button>
  );

  return (
    <Contexto.Provider value={abrir}>
      {children}
      {objetivo?.accion === "oportunidad" && (
        <NuevaOportunidad
          key={objetivo.vez}
          catalogos={catalogos}
          contactoId={objetivo.id}
          empresaId={objetivo.empresaId ?? undefined}
        >
          {oculto}
        </NuevaOportunidad>
      )}
      {objetivo && objetivo.accion !== "oportunidad" && (
        <NuevaInteraccion
          key={objetivo.vez}
          catalogos={catalogos}
          contactoId={objetivo.id}
          empresaId={objetivo.empresaId ?? undefined}
          tipo={objetivo.accion}
        >
          {oculto}
        </NuevaInteraccion>
      )}
    </Contexto.Provider>
  );
}

export async function copiar(texto: string, aviso = "Copiado.") {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("No se pudo copiar.");
  }
}

type ContactoMenu = {
  id: string;
  nombre: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  empresa: { id: string; nombre: string } | null;
};

/** Menú «…» de un contacto en tablas y tarjetas. */
export function MenuContacto({ c, className = "" }: { c: ContactoMenu; className?: string }) {
  const abrir = useContext(Contexto);
  const lanzar = (accion: Objetivo["accion"]) => abrir?.({ id: c.id, empresaId: c.empresa?.id ?? null, accion });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${nombreCompleto(c)}`}
          className={`grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento ${className}`}
        >
          <DotsThree className="size-5" weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{nombreCompleto(c)}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={ruta.contacto(c.id)}>
            <UserCircle className="size-4" aria-hidden /> Abrir ficha
          </Link>
        </DropdownMenuItem>
        {c.empresa && (
          <DropdownMenuItem asChild>
            <Link href={ruta.empresa(c.empresa.id)}>
              <Buildings className="size-4" aria-hidden /> Abrir {c.empresa.nombre}
            </Link>
          </DropdownMenuItem>
        )}
        {abrir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => lanzar("oportunidad")}>
              <Briefcase className="size-4" aria-hidden /> Nueva oportunidad
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => lanzar("llamada")}>
              <Phone className="size-4" aria-hidden /> Registrar llamada
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => lanzar("email")}>
              <EnvelopeSimple className="size-4" aria-hidden /> Registrar email
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => lanzar("reunion")}>
              <UsersThree className="size-4" aria-hidden /> Registrar reunión
            </DropdownMenuItem>
          </>
        )}
        {(c.email || c.telefono) && <DropdownMenuSeparator />}
        {c.email && (
          <DropdownMenuItem onSelect={() => copiar(c.email!, "Email copiado.")}>
            <Copy className="size-4" aria-hidden /> Copiar email
          </DropdownMenuItem>
        )}
        {c.telefono && (
          <DropdownMenuItem asChild>
            <a href={`tel:${c.telefono.replace(/\s/g, "")}`}>
              <PhoneOutgoing className="size-4" aria-hidden /> Llamar ahora
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
