/** Estado que devuelven las server actions a los formularios. */
export type EstadoAccion = {
  ok: boolean | null;
  mensaje: string;
};

export const ESTADO_INICIAL: EstadoAccion = { ok: null, mensaje: "" };

export function textoDe(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}
