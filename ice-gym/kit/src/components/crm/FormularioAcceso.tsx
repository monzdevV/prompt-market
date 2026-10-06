"use client";

import { useActionState } from "react";
import { MARCA } from "@/marca";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { entrar } from "@/app/crm/acciones/sesion";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${claseBotonPrincipal} mt-2 w-full`}>
      {pending ? "Entrando…" : "Entrar"}
      <ArrowRight className="size-4" weight="bold" aria-hidden />
    </button>
  );
}

export function FormularioAcceso({ siguiente }: { siguiente?: string }) {
  const [estado, accion] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={accion} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="siguiente" value={siguiente ?? ""} />

      <label className="flex flex-col gap-1.5">
        <span className="condensada text-[0.85rem] text-tinta">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder={`tu@${MARCA.dominio}`}
          className={claseCampo}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="condensada text-[0.85rem] text-tinta">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={claseCampo}
        />
      </label>

      {estado.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}

      <Boton />
    </form>
  );
}
