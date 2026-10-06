import type { ReactNode } from "react";
import {
  ESTADOS_EMPRESA,
  ETIQUETA_ESTADO_EMPRESA,
  ETIQUETA_TIPO_EMPRESA,
  SECTORES,
  TIPOS_EMPRESA,
  etiquetaSector,
  nombreCompleto,
  type Empresa,
  type Miembro,
} from "@/lib/b2b";
import { claseCampo } from "@/components/crm/Primitivas";

/** Campos del alta y la edición de empresa, agrupados. Sin estado: vale para cualquier <form>. */

export const claseSelect = `${claseCampo} appearance-none`;
export const claseArea = `${claseCampo} h-auto py-2`;

export function Campo({
  etiqueta,
  children,
  className = "",
  ayuda,
}: {
  etiqueta: string;
  children: ReactNode;
  className?: string;
  ayuda?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[0.8125rem] font-medium text-tinta">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs text-tinta-2">{ayuda}</span>}
    </label>
  );
}

export function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-2">{titulo}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function CamposEmpresa({
  equipo,
  empresa,
  conLogo = false,
}: {
  equipo: Miembro[];
  empresa?: Partial<Empresa>;
  conLogo?: boolean;
}) {
  const e = empresa ?? {};
  const sectores: string[] = [...SECTORES];
  if (e.sector && !sectores.includes(e.sector)) sectores.push(e.sector);

  return (
    <div className="flex flex-col gap-6">
      <Grupo titulo="Identidad">
        <Campo etiqueta="Nombre" className="sm:col-span-2">
          <input name="nombre" required minLength={2} defaultValue={e.nombre ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Tipo de relación">
          <select name="tipo" defaultValue={e.tipo ?? "prospecto"} className={claseSelect}>
            {TIPOS_EMPRESA.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_EMPRESA[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Sector">
          <select name="sector" defaultValue={e.sector ?? "otros"} className={claseSelect}>
            {sectores.map((s) => (
              <option key={s} value={s}>
                {etiquetaSector(s)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="CIF / NIF">
          <input name="cif" defaultValue={e.cif ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
        {conLogo && (
          <Campo etiqueta="URL del logo">
            <input name="logo_url" type="url" defaultValue={e.logo_url ?? ""} placeholder="https://…" className={claseCampo} />
          </Campo>
        )}
      </Grupo>

      <Grupo titulo="Contacto">
        <Campo etiqueta="Web" className="sm:col-span-2">
          <input name="web" defaultValue={e.web ?? ""} placeholder="empresa.com" autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Email">
          <input name="email" type="email" defaultValue={e.email ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Teléfono">
          <input name="telefono" type="tel" defaultValue={e.telefono ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
      </Grupo>

      <Grupo titulo="Ubicación">
        <Campo etiqueta="Dirección" className="sm:col-span-2">
          <input name="direccion" defaultValue={e.direccion ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Ciudad">
          <input name="ciudad" defaultValue={e.ciudad ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="País">
          <input name="pais" defaultValue={e.pais ?? "España"} autoComplete="off" className={claseCampo} />
        </Campo>
      </Grupo>

      <Grupo titulo="Gestión">
        <Campo etiqueta="Estado">
          <select name="estado" defaultValue={e.estado ?? "activa"} className={claseSelect}>
            {ESTADOS_EMPRESA.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_ESTADO_EMPRESA[s]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Responsable interno">
          <select name="responsable_id" defaultValue={e.responsable_id ?? ""} className={claseSelect}>
            <option value="">Sin asignar</option>
            {equipo
              .filter((m) => m.activo || m.id === e.responsable_id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {nombreCompleto(m)}
                </option>
              ))}
          </select>
        </Campo>
        <Campo etiqueta="Descripción" className="sm:col-span-2">
          <textarea
            name="descripcion"
            rows={3}
            defaultValue={e.descripcion ?? ""}
            placeholder="A qué se dedica y qué relación tenemos"
            className={claseArea}
          />
        </Campo>
      </Grupo>
    </div>
  );
}

/** Web normalizada a URL absoluta, para enlaces. */
export function urlWeb(web: string) {
  return /^https?:\/\//i.test(web) ? web : `https://${web}`;
}
export const webLimpia = (web: string) => web.replace(/^https?:\/\//i, "").replace(/\/$/, "");
