"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CaretUpDown, Check, X } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { LogoEmpresa } from "@/components/crm/b2b/Piezas";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import {
  ESTADOS_CONTACTO,
  ETIQUETA_ESTADO_CONTACTO,
  ETIQUETA_TIPO_CONTACTO,
  ETIQUETA_TIPO_EMPRESA,
  TIPOS_CONTACTO,
  nombreCompleto,
  type Contacto,
  type EmpresaMini,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import type { Resultado } from "@/app/crm/acciones/b2b";

/** Formulario completo de contacto: lo comparten el alta (Dialog) y la edición (Sheet). */

export function Campo({
  etiqueta,
  children,
  className = "",
  htmlFor,
}: {
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-tinta">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Combobox con búsqueda sobre las empresas del catálogo. Lista en línea (sin portal) para convivir con Dialog/Sheet. */
export function SelectorEmpresa({
  empresas,
  valor,
  onCambio,
  nombre = "empresa_id",
  id,
}: {
  empresas: EmpresaMini[];
  valor: string;
  onCambio: (id: string) => void;
  nombre?: string;
  id?: string;
}) {
  const propio = useId();
  const idCampo = id ?? propio;
  const idLista = `${idCampo}-lista`;
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);

  const elegida = empresas.find((e) => e.id === valor) ?? null;
  const opciones = useMemo(() => {
    const q = normal(texto.trim());
    const r = q ? empresas.filter((e) => normal(e.nombre).includes(q)) : empresas;
    return r.slice(0, 60);
  }, [empresas, texto]);

  function elegir(e: EmpresaMini | null) {
    onCambio(e?.id ?? "");
    setTexto("");
    setAbierto(false);
  }

  function teclado(ev: React.KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      setAbierto(true);
      const n = ev.key === "ArrowDown" ? Math.min(activo + 1, opciones.length - 1) : Math.max(activo - 1, 0);
      setActivo(n);
      lista.current?.querySelector<HTMLElement>(`[data-i="${n}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "Enter" && abierto) {
      ev.preventDefault();
      if (opciones[activo]) elegir(opciones[activo]);
    } else if (ev.key === "Escape" && abierto) {
      ev.preventDefault();
      ev.stopPropagation();
      setAbierto(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={nombre} value={valor} />
      <div className="relative flex items-center">
        {elegida && !abierto && (
          <span className="pointer-events-none absolute left-2.5">
            <LogoEmpresa nombre={elegida.nombre} url={elegida.logo_url} tamano="xs" />
          </span>
        )}
        <input
          id={idCampo}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={abierto && opciones[activo] ? `${idLista}-${activo}` : undefined}
          autoComplete="off"
          value={abierto ? texto : (elegida?.nombre ?? "")}
          placeholder={abierto ? "Buscar empresa…" : "Sin empresa"}
          onFocus={() => {
            setAbierto(true);
            setActivo(0);
          }}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          onChange={(e) => {
            setTexto(e.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onKeyDown={teclado}
          className={`${claseCampo} pr-14 ${elegida && !abierto ? "pl-9" : ""}`}
        />
        <span className="absolute right-2 flex items-center gap-0.5">
          {elegida && (
            <button
              type="button"
              aria-label="Quitar empresa"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(null)}
              className="grid size-6 place-items-center rounded text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
          <CaretUpDown className="size-4 text-tinta-2" aria-hidden />
        </span>
      </div>
      {abierto && (
        <ul
          ref={lista}
          id={idLista}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl bg-placa p-1 shadow-lg ring-1 ring-tinta/5"
        >
          {opciones.length === 0 && <li className="px-2.5 py-2 text-sm text-tinta-2">Ninguna empresa con «{texto}».</li>}
          {opciones.map((e, i) => (
            <li
              key={e.id}
              id={`${idLista}-${i}`}
              data-i={i}
              role="option"
              aria-selected={e.id === valor}
              onMouseDown={(ev) => ev.preventDefault()}
              onMouseEnter={() => setActivo(i)}
              onClick={() => elegir(e)}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                i === activo ? "bg-placa-2 text-tinta" : "text-tinta"
              }`}
            >
              <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" />
              <span className="min-w-0 flex-1 truncate">{e.nombre}</span>
              <span className="shrink-0 text-xs text-tinta-2">{ETIQUETA_TIPO_EMPRESA[e.tipo]}</span>
              {e.id === valor && <Check className="size-3.5 text-acento-tinta" weight="bold" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Enviar({ texto, pendienteTexto }: { texto: string; pendienteTexto: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={claseBotonPrincipal}>
      {pending ? pendienteTexto : texto}
    </button>
  );
}

export function CamposContacto({
  catalogos,
  inicial,
  empresaId,
  conEstado = false,
  estado,
  textoEnviar,
  textoPendiente,
  onCancelar,
}: {
  catalogos: Catalogos;
  inicial?: Partial<Contacto>;
  empresaId?: string;
  conEstado?: boolean;
  estado: Resultado | null;
  textoEnviar: string;
  textoPendiente: string;
  onCancelar?: () => void;
}) {
  const id = useId();
  const [empresa, setEmpresa] = useState(inicial?.empresa_id ?? empresaId ?? "");
  const [principal, setPrincipal] = useState(!!inicial?.principal);
  const select = `${claseCampo} appearance-none`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre" htmlFor={`${id}-nombre`}>
          <input id={`${id}-nombre`} name="nombre" required autoComplete="off" defaultValue={inicial?.nombre} className={claseCampo} autoFocus />
        </Campo>
        <Campo etiqueta="Apellidos" htmlFor={`${id}-apellidos`}>
          <input id={`${id}-apellidos`} name="apellidos" autoComplete="off" defaultValue={inicial?.apellidos} className={claseCampo} />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Empresa" htmlFor={`${id}-empresa`}>
          <SelectorEmpresa id={`${id}-empresa`} empresas={catalogos.empresas} valor={empresa} onCambio={setEmpresa} />
        </Campo>
        <Campo etiqueta="Cargo" htmlFor={`${id}-cargo`}>
          <input id={`${id}-cargo`} name="cargo" autoComplete="off" defaultValue={inicial?.cargo ?? ""} placeholder="p. ej. Director de compras" className={claseCampo} />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Email" htmlFor={`${id}-email`}>
          <input id={`${id}-email`} name="email" type="email" autoComplete="off" defaultValue={inicial?.email ?? ""} className={claseCampo} />
        </Campo>
        <Campo etiqueta="Teléfono" htmlFor={`${id}-telefono`}>
          <input id={`${id}-telefono`} name="telefono" type="tel" autoComplete="off" defaultValue={inicial?.telefono ?? ""} className={claseCampo} />
        </Campo>
      </div>

      <Campo etiqueta="LinkedIn" htmlFor={`${id}-linkedin`}>
        <input
          id={`${id}-linkedin`}
          name="linkedin"
          type="url"
          autoComplete="off"
          defaultValue={inicial?.linkedin ?? ""}
          placeholder="https://www.linkedin.com/in/…"
          className={claseCampo}
        />
      </Campo>

      {conEstado && (
        <Campo etiqueta="Foto (URL)" htmlFor={`${id}-avatar`}>
          <input id={`${id}-avatar`} name="avatar_url" type="url" autoComplete="off" defaultValue={inicial?.avatar_url ?? ""} placeholder="https://…" className={claseCampo} />
        </Campo>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Ciudad" htmlFor={`${id}-ciudad`}>
          <input id={`${id}-ciudad`} name="ciudad" autoComplete="off" defaultValue={inicial?.ciudad ?? ""} className={claseCampo} />
        </Campo>
        <Campo etiqueta="País" htmlFor={`${id}-pais`}>
          <input id={`${id}-pais`} name="pais" autoComplete="off" defaultValue={inicial?.pais ?? "España"} className={claseCampo} />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Tipo de contacto" htmlFor={`${id}-tipo`}>
          <select id={`${id}-tipo`} name="tipo" defaultValue={inicial?.tipo ?? "decisor"} className={select}>
            {TIPOS_CONTACTO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_CONTACTO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Rol en la cuenta" htmlFor={`${id}-rol`}>
          <input id={`${id}-rol`} name="rol" autoComplete="off" defaultValue={inicial?.rol ?? ""} placeholder="p. ej. Firma contratos" className={claseCampo} />
        </Campo>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Responsable" htmlFor={`${id}-responsable`}>
          <select id={`${id}-responsable`} name="responsable_id" defaultValue={inicial?.responsable_id ?? ""} className={select}>
            <option value="">Sin asignar</option>
            {catalogos.equipo
              .filter((m) => m.activo || m.id === inicial?.responsable_id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {nombreCompleto(m)}
                </option>
              ))}
          </select>
        </Campo>
        {conEstado && (
          <Campo etiqueta="Estado" htmlFor={`${id}-estado`}>
            <select id={`${id}-estado`} name="estado" defaultValue={inicial?.estado ?? "activo"} className={select}>
              {ESTADOS_CONTACTO.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_CONTACTO[e]}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-placa-2 px-3 py-2.5">
        <label htmlFor={`${id}-principal`} className="flex min-w-0 flex-col">
          <span className="text-[0.8125rem] font-medium text-tinta">Contacto principal</span>
          <span className="text-xs text-tinta-2">
            {empresa ? "El interlocutor de referencia de la empresa. Sólo hay uno." : "Elige antes una empresa."}
          </span>
        </label>
        <input type="hidden" name="principal" value={principal && empresa ? "true" : "false"} />
        <Switch
          id={`${id}-principal`}
          checked={principal && !!empresa}
          disabled={!empresa}
          onCheckedChange={setPrincipal}
          className="data-checked:bg-acento"
        />
      </div>

      <Campo etiqueta="Notas" htmlFor={`${id}-notas`}>
        <textarea
          id={`${id}-notas`}
          name="notas"
          rows={3}
          defaultValue={inicial?.notas ?? ""}
          placeholder="Contexto, preferencias, cómo prefiere que le contacten…"
          className={`${claseCampo} h-auto resize-y py-2 leading-relaxed`}
        />
      </Campo>

      {estado?.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-tinta-2 hover:bg-placa-2 hover:text-tinta"
          >
            Cancelar
          </button>
        )}
        <Enviar texto={textoEnviar} pendienteTexto={textoPendiente} />
      </div>
    </div>
  );
}
