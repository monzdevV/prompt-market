"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOut,
  CheckCircle,
  DotsThree,
  EnvelopeSimple,
  Handshake,
  NotePencil,
  Phone,
  UserPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
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
import { NuevaOportunidad } from "@/components/crm/oportunidades/NuevaOportunidad";
import { NuevoContacto } from "@/components/crm/contactos/NuevoContacto";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { cambiarEstadoEmpresa } from "@/app/crm/acciones/empresas";
import {
  ESTADOS_EMPRESA,
  ETIQUETA_ESTADO_EMPRESA,
  TONO_ESTADO_EMPRESA,
  ruta,
  type Empresa,
  type EstadoEmpresa,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { urlWeb } from "./CamposEmpresa";

export type AccionRapida = "oportunidad" | "contacto" | "actividad";
type Peticion = { accion: AccionRapida; empresaId: string; n: number };

/**
 * Los diálogos de alta viven fuera del menú (si no, se desmontan al cerrarlo).
 * El menú pide una acción y el lanzador monta el diálogo con esa empresa y lo abre.
 */
export function useLanzador(catalogos: Catalogos) {
  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const disparador = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!peticion) return;
    // Un fotograma de margen para que el menú termine de cerrarse y devuelva el foco.
    const f = requestAnimationFrame(() => disparador.current?.click());
    return () => cancelAnimationFrame(f);
  }, [peticion]);

  const lanzar = (accion: AccionRapida, empresaId: string) =>
    setPeticion((p) => ({ accion, empresaId, n: (p?.n ?? 0) + 1 }));

  const boton = <button ref={disparador} type="button" tabIndex={-1} aria-hidden className="sr-only" />;
  const dialogos = peticion ? (
    <div className="contents" key={peticion.n}>
      {peticion.accion === "oportunidad" && (
        <NuevaOportunidad catalogos={catalogos} empresaId={peticion.empresaId}>
          {boton}
        </NuevaOportunidad>
      )}
      {peticion.accion === "contacto" && (
        <NuevoContacto catalogos={catalogos} empresaId={peticion.empresaId}>
          {boton}
        </NuevoContacto>
      )}
      {peticion.accion === "actividad" && (
        <NuevaInteraccion catalogos={catalogos} empresaId={peticion.empresaId}>
          {boton}
        </NuevaInteraccion>
      )}
    </div>
  ) : null;

  return { lanzar, dialogos };
}

export function MenuEmpresa({
  empresa,
  lanzar,
}: {
  empresa: Pick<Empresa, "id" | "nombre" | "estado" | "web" | "email" | "telefono">;
  lanzar: (accion: AccionRapida, empresaId: string) => void;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();

  function cambiarEstado(estado: EstadoEmpresa) {
    empezar(async () => {
      const r = await cambiarEstadoEmpresa(empresa.id, estado);
      if (r.ok) {
        toast.success(`${empresa.nombre}: ${ETIQUETA_ESTADO_EMPRESA[estado].toLowerCase()}`);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${empresa.nombre}`}
          disabled={pendiente}
          className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:opacity-50"
        >
          <DotsThree className="size-5" weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={ruta.empresa(empresa.id)}>
            <ArrowSquareOut aria-hidden /> Abrir ficha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => lanzar("oportunidad", empresa.id)}>
          <Handshake aria-hidden /> Nueva oportunidad
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => lanzar("contacto", empresa.id)}>
          <UserPlus aria-hidden /> Nuevo contacto
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => lanzar("actividad", empresa.id)}>
          <NotePencil aria-hidden /> Registrar actividad
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CheckCircle aria-hidden /> Cambiar estado
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ESTADOS_EMPRESA.map((e) => (
              <DropdownMenuItem key={e} disabled={e === empresa.estado} onSelect={() => cambiarEstado(e)}>
                <span className="size-2 rounded-full" style={{ background: TONO_ESTADO_EMPRESA[e] }} aria-hidden />
                {ETIQUETA_ESTADO_EMPRESA[e]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {(empresa.telefono || empresa.email || empresa.web) && <DropdownMenuSeparator />}
        {empresa.telefono && (
          <DropdownMenuItem asChild>
            <a href={`tel:${empresa.telefono.replace(/\s/g, "")}`}>
              <Phone aria-hidden /> Llamar
            </a>
          </DropdownMenuItem>
        )}
        {empresa.email && (
          <DropdownMenuItem asChild>
            <a href={`mailto:${empresa.email}`}>
              <EnvelopeSimple aria-hidden /> Enviar email
            </a>
          </DropdownMenuItem>
        )}
        {empresa.web && (
          <DropdownMenuItem asChild>
            <a href={urlWeb(empresa.web)} target="_blank" rel="noopener noreferrer">
              <ArrowSquareOut aria-hidden /> Abrir web
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
