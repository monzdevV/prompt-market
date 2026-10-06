import Link from "next/link";
import { marca } from "@/lib/marca";

/** Marca: dos cuadrados superpuestos, el original y su calco desplazado. */
export function Logotipo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 22 22" className="size-5" aria-hidden="true">
        <rect x="1" y="1" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="8" y="8" width="13" height="13" fill="var(--senal)" />
      </svg>
      <span className="rotulo text-[1.6rem] leading-none tracking-[0.02em]">{marca.nombre}</span>
    </span>
  );
}

export function Cabecera() {
  return (
    <header className="sticky top-0 z-30 border-b border-linea bg-suelo">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-40 focus:bg-senal focus:px-3 focus:py-2 focus:text-sobre-senal"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label={`${marca.nombre}, inicio`} className="text-tinta">
          <Logotipo />
        </Link>
        <nav aria-label="Principal">
          <ul className="flex items-center gap-1 text-sm sm:gap-2">
            <li className="hidden xs:block">
              <Link href="/#como-funciona" className="px-2 py-2 text-tinta-2 hover:text-tinta">
                Cómo funciona
              </Link>
            </li>
            <li>
              <Link href="/legal/licencia" className="px-2 py-2 text-tinta-2 hover:text-tinta">
                Licencia
              </Link>
            </li>
            <li>
              <Link
                href="/#catalogo"
                className="pulsable ml-1 inline-flex min-h-9 items-center border border-tinta px-3 font-semibold text-tinta hover:bg-tinta hover:text-suelo"
              >
                Catálogo
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
