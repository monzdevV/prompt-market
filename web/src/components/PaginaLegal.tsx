import { Sello } from "./Sello";

/** Envoltorio de las páginas legales. Todas son BORRADOR hasta que las revise un profesional. */
export function PaginaLegal({ titulo, actualizado, children }: { titulo: string; actualizado: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[90rem] px-4 pt-10 pb-8 sm:px-6 lg:px-10">
      <div className="max-w-[72ch]">
        <Sello>Borrador · pendiente de revisión legal</Sello>
        <h1 className="rotulo mt-6 text-[clamp(2.75rem,8vw,4.75rem)]">{titulo}</h1>
        <p className="mt-3 text-sm text-tinta-3">Versión de trabajo del {actualizado}. No es un texto definitivo.</p>
        <div
          role="note"
          className="mt-8 border-y-2 border-dashed border-senal py-4 text-sm text-tinta-2"
        >
          Este texto es un borrador orientativo redactado para el lanzamiento. Debe revisarlo un profesional (abogado o
          asesor) antes de vender. Los datos entre corchetes están pendientes.
        </div>
        <div className="legal mt-10 space-y-5 text-tinta-2 [&_h2]:rotulo-medio [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:tracking-[0.02em] [&_h2]:text-tinta [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-tinta [&_ul]:space-y-2">
          {children}
        </div>
      </div>
    </article>
  );
}
