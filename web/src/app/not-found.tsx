import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function NoEncontrado() {
  return (
    <section className="mx-auto max-w-[90rem] px-4 pt-16 pb-8 sm:px-6 lg:px-10">
      <h1 className="rotulo max-w-[14ch] text-[clamp(3rem,10vw,6rem)]">Este bulto no está en el manifiesto.</h1>
      <p className="mt-6 max-w-[52ch] text-lg text-tinta-2">
        Error 404: la página no existe o el paquete todavía no se ha publicado.
      </p>
      <Link
        href="/#catalogo"
        className="pulsable mt-8 inline-flex min-h-12 items-center gap-2 bg-senal px-5 font-bold text-sobre-senal hover:bg-tinta hover:text-suelo"
      >
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        Volver al catálogo
      </Link>
    </section>
  );
}
