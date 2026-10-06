import type { Metadata } from "next";
import { SECTORES, TIPOS_EMPRESA, type TipoEmpresa } from "@/lib/b2b";
import { catalogos as leerCatalogos } from "@/lib/datos/b2b";
import {
  contarEmpresasPorTipo,
  filtrarPorTipo,
  leerFiltrosEmpresas,
  listarEmpresas,
  sectoresUsados,
} from "@/lib/datos/empresas";
import { numero } from "@/lib/formato";
import { Encabezado } from "@/components/crm/Primitivas";
import { NuevaEmpresa } from "@/components/crm/empresas/NuevaEmpresa";
import { VistaEmpresas } from "@/components/crm/empresas/VistaEmpresas";

export const metadata: Metadata = { title: "Empresas" };
export const dynamic = "force-dynamic";

export default async function PaginaEmpresas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = leerFiltrosEmpresas(await searchParams);
  const [sinTipo, globales, catalogos, usados] = await Promise.all([
    listarEmpresas({ ...filtros, tipo: "todos" }),
    contarEmpresasPorTipo(),
    leerCatalogos(),
    sectoresUsados(),
  ]);

  const conteoTipos = Object.fromEntries(TIPOS_EMPRESA.map((t) => [t, 0])) as Record<TipoEmpresa, number>;
  for (const e of sinTipo) conteoTipos[e.tipo]++;
  const filas = filtrarPorTipo(sinTipo, filtros.tipo);
  const sectores = [...new Set<string>([...SECTORES, ...usados])];

  const contadores = [
    { k: "empresas", v: globales.total },
    { k: "clientes", v: globales.cliente },
    { k: "proveedores", v: globales.proveedor },
    { k: "partners", v: globales.partner },
  ];

  return (
    <main className="flex flex-col px-4 pb-10 lg:px-8">
      <Encabezado
        titulo="Empresas"
        meta={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {contadores.map((c, i) => (
              <span key={c.k}>
                {i > 0 && <span className="mr-3 text-linea" aria-hidden>·</span>}
                <span className="font-medium tabular-nums text-tinta">{numero(c.v)}</span> {c.k}
              </span>
            ))}
          </span>
        }
        className="px-0 lg:px-0"
      >
        <NuevaEmpresa catalogos={catalogos} />
      </Encabezado>

      <VistaEmpresas
        filas={filas}
        filtros={filtros}
        conteoTipos={conteoTipos}
        totalSinTipo={sinTipo.length}
        catalogos={catalogos}
        sectores={sectores}
        hayEmpresas={globales.total > 0}
      />
    </main>
  );
}
