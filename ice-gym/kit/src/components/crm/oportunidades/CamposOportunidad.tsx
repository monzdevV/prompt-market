"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { CaretUpDown, Check, Plus, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { crearContacto, crearEmpresa } from "@/app/crm/acciones/b2b";
import {
  ESTADOS_OPORTUNIDAD,
  ETAPAS,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_ETAPA,
  ETIQUETA_ORIGEN_B2B,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_SECTOR,
  ETIQUETA_TIPO_EMPRESA,
  ETIQUETA_TIPO_OPORTUNIDAD,
  ORIGENES,
  PRIORIDADES,
  PROBABILIDAD_POR_ETAPA,
  SECTORES,
  TIPOS_EMPRESA,
  TIPOS_OPORTUNIDAD,
  esEtapaAbierta,
  nombreCompleto,
  type ContactoMini,
  type EmpresaMini,
  type Etapa,
  type OportunidadCompleta,
  type TipoEmpresa,
  type Sector,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { claseCampo } from "@/components/crm/Primitivas";
import { LogoEmpresa } from "@/components/crm/b2b/Piezas";
import { normalizar } from "./filtros";

/**
 * Campos del formulario de oportunidad, compartidos por el alta y la edición.
 * Empresa y contacto se eligen con buscador y se pueden crear aquí mismo, sin
 * salir del diálogo (mini-formularios en línea, que no son <form> anidados).
 */

const select = `${claseCampo} appearance-none`;
const area = `${claseCampo} h-auto py-2`;

export function Campo({
  etiqueta,
  children,
  className = "",
  htmlFor,
}: {
  etiqueta: string;
  children: ReactNode;
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

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-linea pt-4 first:border-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-xs font-semibold uppercase tracking-wide text-tinta-2">{titulo}</legend>
      {children}
    </fieldset>
  );
}

const hoyMas = (dias: number) => {
  const d = new Date(Date.now() + dias * 86_400_000);
  return d.toISOString().slice(0, 10);
};

/* ------------------------------ Combobox de empresa ------------------------------ */

function ComboEmpresa({
  id,
  empresas,
  valor,
  onCambio,
}: {
  id: string;
  empresas: EmpresaMini[];
  valor: string;
  onCambio: (id: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [q, setQ] = useState("");
  const actual = empresas.find((e) => e.id === valor);
  const n = normalizar(q.trim());
  const visibles = (n ? empresas.filter((e) => normalizar(e.nombre).includes(n)) : empresas).slice(0, 80);

  function elegir(v: string) {
    onCambio(v);
    setAbierta(false);
    setQ("");
  }

  return (
    <Popover open={abierta} onOpenChange={setAbierta}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={abierta}
          aria-controls={`${id}-lista`}
          aria-haspopup="listbox"
          className={`${claseCampo} flex items-center gap-2 text-left`}
        >
          {actual ? (
            <>
              <LogoEmpresa nombre={actual.nombre} url={actual.logo_url} tamano="xs" />
              <span className="min-w-0 flex-1 truncate">{actual.nombre}</span>
            </>
          ) : (
            <span className="flex-1 text-tinta-2">Sin empresa</span>
          )}
          <CaretUpDown className="size-4 shrink-0 text-tinta-2" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <div className="border-b border-linea p-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (visibles[0]) elegir(visibles[0].id);
              }
            }}
            placeholder="Buscar empresa…"
            aria-label="Buscar empresa"
            className="h-8 w-full rounded-md border border-linea bg-placa px-2 text-sm text-tinta outline-none focus:border-acento"
          />
        </div>
        <ul id={`${id}-lista`} role="listbox" aria-label="Empresas" className="max-h-64 overflow-y-auto p-1">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!valor}
              onClick={() => elegir("")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta-2 hover:bg-placa-2 focus-visible:bg-placa-2 focus-visible:outline-none"
            >
              <Check className={`size-4 ${valor ? "invisible" : ""}`} aria-hidden />
              Sin empresa
            </button>
          </li>
          {visibles.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                role="option"
                aria-selected={e.id === valor}
                onClick={() => elegir(e.id)}
                className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-tinta hover:bg-placa-2 focus-visible:bg-placa-2 focus-visible:outline-none"
              >
                <Check className={`size-4 shrink-0 ${e.id === valor ? "" : "invisible"}`} aria-hidden />
                <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" />
                <span className="min-w-0 flex-1 truncate">{e.nombre}</span>
                <span className="shrink-0 text-xs text-tinta-2">{ETIQUETA_TIPO_EMPRESA[e.tipo]}</span>
              </button>
            </li>
          ))}
          {visibles.length === 0 && <li className="px-3 py-4 text-center text-sm text-tinta-2">Ninguna coincide</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------ Mini-formularios en línea ------------------------------ */

const claseEnLinea = "flex flex-col gap-2.5 rounded-lg border border-acento/30 bg-acento/5 p-3";
const botonSec =
  "inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta";
const botonOk = "inline-flex h-8 items-center gap-1 rounded-md bg-acento px-3 text-[0.8125rem] font-medium text-sobre-campo disabled:opacity-50";

/** Intro en un campo del mini-formulario crea, en vez de enviar el formulario principal. */
const conIntro = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    fn();
  }
};

function EmpresaEnLinea({ onCreada, onCancelar }: { onCreada: (e: EmpresaMini) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoEmpresa>("prospecto");
  const [sector, setSector] = useState<Sector>("otros");
  const [pendiente, empezar] = useTransition();

  function crear() {
    if (nombre.trim().length < 2) {
      toast.error("Pon el nombre de la empresa.");
      return;
    }
    empezar(async () => {
      const fd = new FormData();
      fd.set("nombre", nombre);
      fd.set("tipo", tipo);
      fd.set("sector", sector);
      const r = await crearEmpresa(null, fd);
      if (r.ok && r.id) {
        toast.success(r.mensaje);
        onCreada({ id: r.id, nombre: nombre.trim(), tipo, sector, logo_url: null });
      } else toast.error(r.mensaje);
    });
  }

  return (
    <div className={claseEnLinea} role="group" aria-label="Nueva empresa">
      <p className="text-[0.8125rem] font-semibold text-tinta">Nueva empresa</p>
      <input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={conIntro(crear)}
        placeholder="Nombre de la empresa"
        aria-label="Nombre de la empresa"
        className={claseCampo}
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEmpresa)} aria-label="Tipo de empresa" className={select}>
          {TIPOS_EMPRESA.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO_EMPRESA[t]}
            </option>
          ))}
        </select>
        <select value={sector} onChange={(e) => setSector(e.target.value as Sector)} aria-label="Sector" className={select}>
          {SECTORES.map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_SECTOR[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className={botonSec}>
          Cancelar
        </button>
        <button type="button" onClick={crear} disabled={pendiente} className={botonOk}>
          {pendiente ? "Creando…" : "Crear y elegir"}
        </button>
      </div>
    </div>
  );
}

function ContactoEnLinea({
  empresa,
  onCreado,
  onCancelar,
}: {
  empresa: EmpresaMini | undefined;
  onCreado: (c: ContactoMini) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cargo, setCargo] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pendiente, empezar] = useTransition();

  function crear() {
    if (!nombre.trim()) {
      toast.error("Pon el nombre del contacto.");
      return;
    }
    empezar(async () => {
      const fd = new FormData();
      fd.set("nombre", nombre);
      fd.set("apellidos", apellidos);
      fd.set("cargo", cargo);
      fd.set("email", email);
      fd.set("telefono", telefono);
      if (empresa) fd.set("empresa_id", empresa.id);
      const r = await crearContacto(null, fd);
      if (r.ok && r.id) {
        toast.success(r.mensaje);
        onCreado({
          id: r.id,
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          cargo: cargo.trim() || null,
          email: email.trim() || null,
          telefono: telefono.trim() || null,
          avatar_url: null,
          empresa_id: empresa?.id ?? null,
        });
      } else toast.error(r.mensaje);
    });
  }

  return (
    <div className={claseEnLinea} role="group" aria-label="Nuevo contacto">
      <p className="text-[0.8125rem] font-semibold text-tinta">
        Nuevo contacto{empresa ? ` en ${empresa.nombre}` : ""}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={conIntro(crear)} placeholder="Nombre" aria-label="Nombre del contacto" className={claseCampo} />
        <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} onKeyDown={conIntro(crear)} placeholder="Apellidos" aria-label="Apellidos" className={claseCampo} />
        <input value={cargo} onChange={(e) => setCargo(e.target.value)} onKeyDown={conIntro(crear)} placeholder="Cargo" aria-label="Cargo" className={`${claseCampo} col-span-2`} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={conIntro(crear)} placeholder="Email" aria-label="Email" className={claseCampo} />
        <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} onKeyDown={conIntro(crear)} placeholder="Teléfono" aria-label="Teléfono" className={claseCampo} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className={botonSec}>
          Cancelar
        </button>
        <button type="button" onClick={crear} disabled={pendiente} className={botonOk}>
          {pendiente ? "Creando…" : "Crear y elegir"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Empresa + contacto ------------------------------ */

function EmpresaYContacto({
  catalogos,
  empresaInicial,
  contactoInicial,
}: {
  catalogos: Catalogos;
  empresaInicial: string;
  contactoInicial: string;
}) {
  const ids = useId();
  const [empresas, setEmpresas] = useState(catalogos.empresas);
  const [contactos, setContactos] = useState(catalogos.contactos);
  const [empresaId, setEmpresaId] = useState(empresaInicial);
  const [contactoId, setContactoId] = useState(contactoInicial);
  const [creando, setCreando] = useState<"empresa" | "contacto" | null>(null);

  const empresa = empresas.find((e) => e.id === empresaId);
  const deLaEmpresa = empresaId ? contactos.filter((c) => c.empresa_id === empresaId) : contactos;
  const contacto = contactos.find((c) => c.id === contactoId);

  function elegirEmpresa(id: string) {
    setEmpresaId(id);
    const suyos = id ? contactos.filter((c) => c.empresa_id === id) : [];
    // Si el contacto actual no es de la empresa, se cambia por el primero de ella (el principal suele ir primero).
    if (!contactoId || !suyos.some((c) => c.id === contactoId)) setContactoId((suyos.find((c) => c.principal) ?? suyos[0])?.id ?? "");
  }

  function elegirContacto(id: string) {
    setContactoId(id);
    const c = contactos.find((x) => x.id === id);
    if (c?.empresa_id && !empresaId) setEmpresaId(c.empresa_id);
  }

  const botonMas =
    "inline-flex items-center gap-1 text-xs font-medium text-acento-tinta underline-offset-2 hover:underline disabled:opacity-50";

  return (
    <>
      <input type="hidden" name="empresa_id" value={empresaId} />
      <input type="hidden" name="contacto_id" value={contactoId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={`${ids}-empresa`} className="text-[0.8125rem] font-medium text-tinta">
              Empresa
            </label>
            <button type="button" onClick={() => setCreando(creando === "empresa" ? null : "empresa")} className={botonMas}>
              {creando === "empresa" ? <X className="size-3" aria-hidden /> : <Plus className="size-3" weight="bold" aria-hidden />}
              Nueva empresa
            </button>
          </div>
          <ComboEmpresa id={`${ids}-empresa`} empresas={empresas} valor={empresaId} onCambio={elegirEmpresa} />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={`${ids}-contacto`} className="text-[0.8125rem] font-medium text-tinta">
              Contacto
            </label>
            <button type="button" onClick={() => setCreando(creando === "contacto" ? null : "contacto")} className={botonMas}>
              {creando === "contacto" ? <X className="size-3" aria-hidden /> : <Plus className="size-3" weight="bold" aria-hidden />}
              Nuevo contacto
            </button>
          </div>
          <select
            id={`${ids}-contacto`}
            value={contactoId}
            onChange={(e) => elegirContacto(e.target.value)}
            className={select}
          >
            <option value="">{empresaId && deLaEmpresa.length === 0 ? "Esta empresa aún no tiene contactos" : "Sin contacto"}</option>
            {deLaEmpresa.map((c) => (
              <option key={c.id} value={c.id}>
                {nombreCompleto(c)}
                {c.cargo ? ` · ${c.cargo}` : ""}
              </option>
            ))}
          </select>
          {contacto && (contacto.email || contacto.telefono) && (
            <p className="truncate text-xs text-tinta-2">{[contacto.email, contacto.telefono].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </div>

      {creando === "empresa" && (
        <EmpresaEnLinea
          onCancelar={() => setCreando(null)}
          onCreada={(e) => {
            setEmpresas((l) => [...l, e].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
            setEmpresaId(e.id);
            setContactoId("");
            setCreando("contacto"); // lo natural tras crear la empresa es darle un contacto
          }}
        />
      )}
      {creando === "contacto" && (
        <ContactoEnLinea
          empresa={empresa}
          onCancelar={() => setCreando(null)}
          onCreado={(c) => {
            setContactos((l) => [...l, c]);
            setContactoId(c.id);
            setCreando(null);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------ Formulario completo ------------------------------ */

export function CamposOportunidad({
  catalogos,
  inicial,
  empresaId,
  contactoId,
  conEstado = false,
}: {
  catalogos: Catalogos;
  inicial?: OportunidadCompleta;
  empresaId?: string;
  contactoId?: string;
  /** En edición se puede poner en pausa y editar notas / motivo. */
  conEstado?: boolean;
}) {
  const ids = useId();
  const [etapa, setEtapa] = useState<Etapa>(inicial?.etapa ?? "prospeccion");
  const [probabilidad, setProbabilidad] = useState<string>(
    inicial?.probabilidad != null ? String(inicial.probabilidad) : String(PROBABILIDAD_POR_ETAPA[inicial?.etapa ?? "prospeccion"])
  );
  const [probTocada, setProbTocada] = useState(false);
  const empresaInicial = inicial?.empresa_id ?? empresaId ?? "";
  const contactoInicial =
    inicial?.contacto_id ??
    contactoId ??
    (empresaInicial ? catalogos.contactos.find((c) => c.empresa_id === empresaInicial)?.id ?? "" : "");
  const equipo = catalogos.equipo.filter((m) => m.activo || m.id === inicial?.responsable_id);

  return (
    <div className="flex flex-col gap-5">
      <Bloque titulo="Oportunidad">
        <Campo etiqueta="Nombre" htmlFor={`${ids}-nombre`}>
          <input
            id={`${ids}-nombre`}
            name="nombre"
            required
            minLength={2}
            defaultValue={inicial?.nombre}
            autoComplete="off"
            placeholder="p. ej. Renovación de cintas de correr — Centro Norte"
            className={claseCampo}
          />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Tipo" htmlFor={`${ids}-tipo`}>
            <select id={`${ids}-tipo`} name="tipo" defaultValue={inicial?.tipo ?? "venta_cliente"} className={select}>
              {TIPOS_OPORTUNIDAD.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO_OPORTUNIDAD[t]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Etapa" htmlFor={`${ids}-etapa`}>
            <select
              id={`${ids}-etapa`}
              name="etapa"
              value={etapa}
              onChange={(e) => {
                const nueva = e.target.value as Etapa;
                setEtapa(nueva);
                if (!probTocada) setProbabilidad(String(PROBABILIDAD_POR_ETAPA[nueva]));
              }}
              className={select}
            >
              {ETAPAS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ETAPA[e]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Valor (€)" htmlFor={`${ids}-valor`}>
            <input
              id={`${ids}-valor`}
              name="valor"
              inputMode="decimal"
              defaultValue={inicial ? String(inicial.valor) : ""}
              placeholder="0"
              className={`${claseCampo} tabular-nums`}
            />
          </Campo>
          <Campo etiqueta="Probabilidad (%)" htmlFor={`${ids}-prob`}>
            <input
              id={`${ids}-prob`}
              name="probabilidad"
              type="number"
              min={0}
              max={100}
              value={probabilidad}
              onChange={(e) => {
                setProbabilidad(e.target.value);
                setProbTocada(true);
              }}
              disabled={!esEtapaAbierta(etapa)}
              className={`${claseCampo} tabular-nums disabled:opacity-60`}
            />
          </Campo>
          <Campo etiqueta="Cierre estimado" htmlFor={`${ids}-cierre`}>
            <input
              id={`${ids}-cierre`}
              name="fecha_cierre"
              type="date"
              defaultValue={inicial?.fecha_cierre?.slice(0, 10) ?? ""}
              className={claseCampo}
            />
          </Campo>
          <Campo etiqueta="Prioridad" htmlFor={`${ids}-prioridad`}>
            <select id={`${ids}-prioridad`} name="prioridad" defaultValue={inicial?.prioridad ?? "media"} className={select}>
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {ETIQUETA_PRIORIDAD[p]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Origen" htmlFor={`${ids}-origen`}>
            <select id={`${ids}-origen`} name="origen" defaultValue={inicial?.origen ?? "otro"} className={select}>
              {ORIGENES.map((o) => (
                <option key={o} value={o}>
                  {ETIQUETA_ORIGEN_B2B[o]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Responsable" htmlFor={`${ids}-resp`}>
            <select id={`${ids}-resp`} name="responsable_id" defaultValue={inicial?.responsable_id ?? ""} className={select}>
              <option value="">Sin asignar</option>
              {equipo.map((m) => (
                <option key={m.id} value={m.id}>
                  {nombreCompleto(m)}
                  {m.puesto ? ` · ${m.puesto}` : ""}
                </option>
              ))}
            </select>
          </Campo>
          {conEstado && esEtapaAbierta(etapa) && (
            <Campo etiqueta="Estado" htmlFor={`${ids}-estado`}>
              <select id={`${ids}-estado`} name="estado" defaultValue={inicial?.estado === "en_pausa" ? "en_pausa" : "abierta"} className={select}>
                {ESTADOS_OPORTUNIDAD.filter((e) => e === "abierta" || e === "en_pausa").map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO_OPORTUNIDAD[e]}
                  </option>
                ))}
              </select>
            </Campo>
          )}
        </div>
        {conEstado && etapa === "perdida" && (
          <Campo etiqueta="Motivo de pérdida" htmlFor={`${ids}-motivo`}>
            <input id={`${ids}-motivo`} name="motivo_perdida" defaultValue={inicial?.motivo_perdida ?? ""} className={claseCampo} />
          </Campo>
        )}
      </Bloque>

      <Bloque titulo="Empresa y contacto">
        <EmpresaYContacto catalogos={catalogos} empresaInicial={empresaInicial} contactoInicial={contactoInicial} />
      </Bloque>

      <Bloque titulo="Detalle">
        <Campo etiqueta="Descripción" htmlFor={`${ids}-desc`}>
          <textarea id={`${ids}-desc`} name="descripcion" rows={3} defaultValue={inicial?.descripcion ?? ""} className={area} placeholder="Qué se vende, compra o acuerda" />
        </Campo>
        <Campo etiqueta="Necesidad detectada" htmlFor={`${ids}-nec`}>
          <textarea id={`${ids}-nec`} name="necesidad" rows={2} defaultValue={inicial?.necesidad ?? ""} className={area} placeholder="El problema o la oportunidad de fondo" />
        </Campo>
        {conEstado && (
          <Campo etiqueta="Notas internas" htmlFor={`${ids}-notas`}>
            <textarea id={`${ids}-notas`} name="notas" rows={3} defaultValue={inicial?.notas ?? ""} className={area} />
          </Campo>
        )}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Campo etiqueta="Próxima acción" htmlFor={`${ids}-accion`}>
            <input id={`${ids}-accion`} name="proxima_accion" defaultValue={inicial?.proxima_accion ?? ""} placeholder="p. ej. Enviar propuesta" className={claseCampo} />
          </Campo>
          <Campo etiqueta="Fecha" htmlFor={`${ids}-accion-fecha`}>
            <input
              id={`${ids}-accion-fecha`}
              name="proxima_accion_fecha"
              type="date"
              defaultValue={inicial ? (inicial.proxima_accion_fecha?.slice(0, 10) ?? "") : hoyMas(3)}
              className={claseCampo}
            />
          </Campo>
        </div>
      </Bloque>
    </div>
  );
}
