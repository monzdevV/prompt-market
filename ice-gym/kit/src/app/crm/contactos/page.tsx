import type { Metadata } from "next";
import { catalogos } from "@/lib/datos/b2b";
import { listarContactos, resumenContactos } from "@/lib/datos/contactos";
import { numero } from "@/lib/formato";
import { Encabezado } from "@/components/crm/Primitivas";
import { leerFiltrosContactos } from "@/components/crm/contactos/filtros";
import { VistaContactos } from "@/components/crm/contactos/VistaContactos";
import { NuevoContacto } from "@/components/crm/contactos/NuevoContacto";

export const metadata: Metadata = { title: "Contactos" };
export const dynamic = "force-dynamic";

export default async function PaginaContactos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = leerFiltrosContactos(await searchParams);
  const [contactos, resumen, cat] = await Promise.all([listarContactos(filtros), resumenContactos(), catalogos()]);

  const cifras = [
    { k: "contactos", v: resumen.total },
    { k: "activos", v: resumen.activos },
    { k: "principales", v: resumen.principales },
    { k: resumen.empresas === 1 ? "empresa" : "empresas", v: resumen.empresas },
  ];

  return (
    <main className="flex flex-col px-4 pb-10 md:h-[calc(100dvh-3.5rem)] md:pb-4 lg:px-8">
      <Encabezado
        titulo="Contactos"
        className="px-0 lg:px-0"
        meta={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {cifras.map((c) => (
              <span key={c.k}>
                <span className="font-medium tabular-nums text-tinta">{numero(c.v)}</span> {c.k}
              </span>
            ))}
            {resumen.sinEmpresa > 0 && (
              <span>
                <span className="font-medium tabular-nums text-tinta">{numero(resumen.sinEmpresa)}</span> sin empresa
              </span>
            )}
          </span>
        }
      >
        <NuevoContacto catalogos={cat} empresaId={filtros.empresa || undefined} />
      </Encabezado>

      <VistaContactos contactos={contactos} catalogos={cat} paises={resumen.paises} limitado={contactos.length >= 2000} />
    </main>
  );
}
