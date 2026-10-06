/** Creación global: cualquier parte del CRM puede pedir abrir un formulario de alta. */

export const TIPOS_CREAR = ["oportunidad", "empresa", "contacto", "tarea", "actividad"] as const;
export type TipoCrear = (typeof TIPOS_CREAR)[number];

export const EVENTO_CREAR = "crm:crear";

export function pedirCrear(tipo: TipoCrear) {
  window.dispatchEvent(new CustomEvent<TipoCrear>(EVENTO_CREAR, { detail: tipo }));
}
