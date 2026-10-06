import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { Bloques } from "@/components/Bloques";
import { BotonCompra } from "@/components/BotonCompra";
import { Faq } from "@/components/Faq";
import { Sello } from "@/components/Sello";
import { TextoRico } from "@/components/TextoRico";
import { CodigoBarras } from "@/components/CodigoBarras";
import {
  faqGeneral,
  formatoBytes,
  formatoNumero,
  formatoPrecio,
  nombreCategoria,
  nombreCorto,
  productoPorSlug,
  productos,
} from "@/lib/catalogo";

// Solo existen las fichas publicadas: cualquier otro slug da 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return productos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) return {};
  const titulo = `${nombreCorto(p.titulo)}: ${p.readme.tipo || p.subtitulo}`;
  return {
    title: titulo,
    description: p.subtitulo,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: titulo, description: p.subtitulo, type: "website", url: `/p/${p.slug}` },
  };
}

const contenedor = "mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10";

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-tinta pt-6">
      <h2 id={id} className="rotulo mb-6 text-[clamp(2rem,4.5vw,3rem)]">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default async function FichaProducto({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) notFound();

  const nombre = nombreCorto(p.titulo);
  const precio = formatoPrecio(p.precio);
  const quedan = Math.max(0, p.vistaPrevia.total - p.vistaPrevia.lineas.length);
  const descripcion = p.readme.secciones.filter((s) => !/^Avisos/i.test(s.titulo));
  const avisos = p.readme.secciones.filter((s) => /^Avisos/i.test(s.titulo));
  const ref = `${p.codigo}-${String(p.precio).padStart(3, "0")}`;

  const ficha: [string, string][] = [
    ["Categoría", nombreCategoria(p.categoria)],
    ["Dificultad", p.dificultad.charAt(0).toUpperCase() + p.dificultad.slice(1)],
    ["Montaje", p.tiempoInstalacion],
    ...(p.preguntas ? ([["Entrevista", `Unas ${p.preguntas} preguntas`]] as [string, string][]) : []),
    ["Paquete", `${formatoNumero(p.paquete.archivos)} archivos · ${formatoBytes(p.paquete.bytes)}`],
  ];

  return (
    <article className={`${contenedor} pt-6 pb-8`}>
      <nav aria-label="Migas" className="text-sm">
        <Link href="/#catalogo" className="inline-flex min-h-10 items-center gap-2 text-tinta-2 hover:text-tinta">
          <ArrowLeft size={14} weight="bold" aria-hidden="true" />
          Catálogo
        </Link>
      </nav>

      <div className="mt-4 grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="min-w-0">
          {/* Cabecera del albarán. */}
          <header className="pb-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rotulo bg-senal px-2 pt-1.5 pb-0.5 text-[1.75rem] leading-none text-sobre-senal">{p.codigo}</span>
              <Sello>Kit verificado</Sello>
              {p.precioBorrador && <Sello tono="tinta">Precio borrador</Sello>}
            </div>
            <h1 className="rotulo mt-6 text-[clamp(3.25rem,10vw,6rem)]">{nombre}</h1>
            <p className="rotulo-medio mt-3 text-[clamp(1.25rem,2.6vw,1.75rem)] leading-tight tracking-[0.01em] text-tinta-2">
              {p.readme.tipo}
            </p>
            <p className="mt-6 max-w-[62ch] text-lg text-tinta">
              <TextoRico texto={p.readme.lema || p.subtitulo} />
            </p>
            {p.readme.intro.length > 0 && (
              <div className="mt-4">
                <Bloques bloques={p.readme.intro} />
              </div>
            )}
          </header>

          <div className="space-y-16">
            <Seccion id="t-contenido" titulo="Contenido declarado">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] border-collapse text-left">
                  <caption className="sr-only">Archivos que recibes en el zip, medidos al generar el catálogo</caption>
                  <thead>
                    <tr className="border-b border-linea">
                      <th scope="col" className="campo py-2 pr-4">Ruta</th>
                      <th scope="col" className="campo py-2 pr-4">Para qué</th>
                      <th scope="col" className="campo py-2 text-right">Medida</th>
                    </tr>
                  </thead>
                  <tbody className="cifras">
                    {p.paquete.contenido.map((c) => (
                      <tr key={c.ruta} className="border-b border-linea align-top">
                        <th scope="row" className="py-3 pr-4 font-mono text-sm font-normal text-tinta">
                          {c.ruta}
                        </th>
                        <td className="py-3 pr-4 text-sm text-tinta-2">{usoArchivo(c.ruta)}</td>
                        <td className="py-3 text-right font-mono text-xs whitespace-nowrap text-tinta-2">
                          {c.tipo === "carpeta"
                            ? `${formatoNumero(c.archivos)} archivos · ${formatoNumero(c.lineas)} líneas de código`
                            : `${formatoNumero(c.lineas)} líneas`}
                          <span className="block text-tinta-3">{formatoBytes(c.bytes)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {p.readme.verificacion && (
                <p className="mt-4 max-w-[62ch] text-sm text-tinta-2">
                  <span className="font-semibold text-tinta">Verificación del kit: </span>
                  <TextoRico texto={p.readme.verificacion} />
                </p>
              )}
            </Seccion>

            {descripcion.map((s, i) => (
              <Seccion key={s.titulo} id={`t-desc-${i}`} titulo={s.titulo}>
                <Bloques bloques={s.bloques} />
              </Seccion>
            ))}

            <Seccion id="t-stack" titulo="Stack y requisitos">
              <ul aria-label="Stack" className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-sm text-tinta">
                {p.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h3 className="rotulo-medio mt-8 text-lg tracking-[0.03em]">Qué necesitas</h3>
              <ul className="mt-3 max-w-[68ch] border-t border-linea">
                {p.requisitos.map((r) => (
                  <li key={r} className="border-b border-linea py-2.5 text-tinta-2">
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-tinta-2">
                <span className="font-semibold text-tinta">Tiempo de montaje: </span>
                {p.tiempoInstalacion}
              </p>
            </Seccion>

            <Seccion id="t-prompt" titulo="Vista previa del prompt">
              <p className="mb-4 max-w-[62ch] text-tinta-2">
                Las primeras {p.vistaPrevia.lineas.length} líneas de PROMPT.md, tal cual. El resto del prompt y el kit se
                entregan con la compra.
              </p>
              <figure className="border border-linea bg-placa">
                <figcaption className="flex items-center justify-between border-b border-linea px-4 py-2 font-mono text-xs text-tinta-3">
                  <span>{p.slug}/PROMPT.md</span>
                  <span className="cifras">
                    {p.vistaPrevia.lineas.length} de {formatoNumero(p.vistaPrevia.total)} líneas
                  </span>
                </figcaption>
                <div className="desvanece-abajo">
                  <pre className="overflow-x-auto py-3 font-mono text-[0.8125rem] leading-6">
                    <code>
                      {p.vistaPrevia.lineas.map((l, i) => (
                        <span key={i} className="grid grid-cols-[3rem_minmax(0,1fr)]">
                          <span aria-hidden="true" className="cifras pr-4 text-right text-tinta-3 select-none">
                            {i + 1}
                          </span>
                          <span className="pr-4 whitespace-pre-wrap text-tinta-2">{l || " "}</span>
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>
                {/* Precinto: aquí se corta lo que se enseña. */}
                <div className="flex items-center gap-3 border-t-2 border-dashed border-senal px-4 py-3 text-sm">
                  <LockSimple size={16} weight="bold" aria-hidden="true" className="shrink-0 text-senal-texto" />
                  <span className="text-tinta-2">
                    <span className="font-semibold text-tinta">Precintado.</span>{" "}
                    {quedan > 0 ? `${formatoNumero(quedan)} líneas más, ` : ""}PERSONALIZAR.md, SPEC.md y el kit llegan en el zip.
                  </span>
                </div>
              </figure>
            </Seccion>

            {avisos.map((s, i) => (
              <Seccion key={s.titulo} id={`t-avisos-${i}`} titulo={s.titulo}>
                <Bloques bloques={s.bloques} />
              </Seccion>
            ))}

            <Seccion id="t-faq" titulo="Preguntas">
              <Faq preguntas={[...p.faq, ...faqGeneral]} />
            </Seccion>
          </div>
        </div>

        {/* Albarán de compra: fijo al hacer scroll en escritorio, arriba del todo en móvil se repite al final. */}
        <aside aria-label="Compra" className="order-first lg:order-none">
          <div className="border border-tinta lg:sticky lg:top-20">
            <div className="flex items-end justify-between gap-4 bg-senal px-5 pt-4 pb-3 text-sobre-senal">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">Precio · pago único</p>
                <p className="rotulo cifras mt-1 text-[3.5rem]">{precio}</p>
              </div>
            </div>
            {p.precioBorrador && (
              <p className="border-b border-tinta px-5 py-2 text-xs text-tinta-2">
                Precio de lanzamiento propuesto, pendiente de confirmar.
              </p>
            )}
            <div className="px-5 pt-5 pb-4">
              <BotonCompra id="compra-lateral" enlace={p.stripePaymentLink} precio={precio} titulo={nombre} />
            </div>
            <dl className="border-t border-tinta text-sm">
              {ficha.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-b border-linea px-5 py-2.5 last:border-b-0">
                  <dt className="campo pt-0.5">{k}</dt>
                  <dd className="cifras text-tinta">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-tinta px-5 py-4 text-xs text-tinta-2">
              Licencia para un proyecto, personal o comercial. Sin reventa del kit.{" "}
              <Link href="/legal/licencia" className="underline hover:text-tinta">
                Leer la licencia
              </Link>
            </div>
            <div className="flex items-end gap-3 border-t border-tinta px-5 py-3">
              <CodigoBarras valor={ref} className="h-9 w-full max-w-[12rem] text-tinta" />
              <span className="cifras font-mono text-xs text-tinta-3">{ref}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Cierre: compra de nuevo al final de la ficha, para quien ha leído hasta aquí. */}
      <div className="mt-20 grid gap-6 border-t border-tinta pt-8 sm:grid-cols-[minmax(0,1fr)_20rem] sm:items-center">
        <p className="rotulo text-[clamp(2rem,5vw,3.25rem)]">
          {nombre}, con tus datos, <span className="text-tinta-2">en {p.tiempoInstalacion.split("·")[0].trim()}.</span>
        </p>
        <BotonCompra id="compra-final" enlace={p.stripePaymentLink} precio={precio} titulo={nombre} />
      </div>
    </article>
  );
}

function usoArchivo(ruta: string) {
  switch (ruta) {
    case "README.md":
      return "La ficha: qué es, qué incluye y avisos";
    case "PROMPT.md":
      return "El prompt maestro que pegas en tu IA";
    case "PERSONALIZAR.md":
      return "El mapa exacto de qué cambia con tus datos";
    case "SPEC.md":
      return "La especificación, para reconstruirlo sin el kit";
    case "negocio.ejemplo.json":
      return "Ejemplo de los datos que guarda la entrevista";
    case "kit/":
      return "El código original completo, que compila tal cual";
    default:
      return "";
  }
}
