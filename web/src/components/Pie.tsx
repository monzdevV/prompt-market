import Link from "next/link";
import { marca } from "@/lib/marca";
import { Logotipo } from "./Cabecera";
import { productos, nombreCorto } from "@/lib/catalogo";

export function Pie() {
  return (
    <footer className="mt-24 border-t border-linea">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div>
          <Logotipo />
          <p className="mt-4 max-w-sm text-sm text-tinta-2">{marca.descripcion}</p>
        </div>
        <nav aria-label="Paquetes">
          <p className="campo">Paquetes</p>
          <ul className="mt-3 space-y-2 text-sm">
            {productos.map((p) => (
              <li key={p.slug}>
                <Link href={`/p/${p.slug}`} className="text-tinta-2 hover:text-tinta">
                  <span className="cifras font-mono text-xs text-tinta-3">{p.codigo}</span> {nombreCorto(p.titulo)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="campo">Legal (borrador)</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/legal/licencia" className="text-tinta-2 hover:text-tinta">
                Términos y licencia de uso
              </Link>
            </li>
            <li>
              <Link href="/legal/privacidad" className="text-tinta-2 hover:text-tinta">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/legal/aviso-legal" className="text-tinta-2 hover:text-tinta">
                Aviso legal
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-linea">
        <p className="mx-auto max-w-[90rem] px-4 py-5 text-xs text-tinta-3 sm:px-6 lg:px-10">
          Los nombres de herramientas de IA se citan solo para indicar compatibilidad; pertenecen a sus dueños y no
          implican relación con {marca.nombre}.
        </p>
      </div>
    </footer>
  );
}
