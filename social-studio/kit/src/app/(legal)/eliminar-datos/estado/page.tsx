import type { Metadata } from "next";
import { deletionStatus } from "@/lib/meta-deletion";

export const metadata: Metadata = { title: "Estado de la eliminación de datos" };

export default async function EstadoEliminacionPage({ searchParams }: PageProps<"/eliminar-datos/estado">) {
  const codigo = (await searchParams).codigo;
  const status = typeof codigo === "string" && codigo.length <= 64 ? deletionStatus(codigo) : null;
  return (
    <>
      <h1>Estado de la eliminación de datos</h1>
      {status ? (
        <p>
          Solicitud <code>{String(codigo)}</code>: <b>completada</b> el{" "}
          {new Date(status.completedAt).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}. Hemos borrado los permisos y
          los datos de Facebook e Instagram asociados ({status.accounts} {status.accounts === 1 ? "cuenta" : "cuentas"}).
        </p>
      ) : (
        <p>No encontramos ninguna solicitud con ese código. Revisa el enlace que te dio Facebook.</p>
      )}
    </>
  );
}
