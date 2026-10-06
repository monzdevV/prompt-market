import Link from "next/link";
import { ArrowDown, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { EtiquetaRotativa } from "@/components/EtiquetaRotativa";
import { datosEtiqueta } from "@/components/Etiqueta";
import { Manifiesto, type FilaManifiesto } from "@/components/Manifiesto";
import { Faq } from "@/components/Faq";
import { categorias, faqGeneral, formatoPrecio, nombreCategoria, nombreCorto, productos } from "@/lib/catalogo";
import { iasAgente, iasChat } from "@/lib/marca";

const contenedor = "mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10";

const paradas = [
  {
    titulo: "Compras",
    texto: "Recibes un zip con el prompt maestro, el mapa de personalización, la especificación y el kit/ con el código original, que ya compila.",
  },
  {
    titulo: "Pegas el prompt en tu IA",
    texto: "Abres tu IA en la carpeta descomprimida y pegas PROMPT.md. Sirve un agente que toca archivos o un chat de los de siempre.",
  },
  {
    titulo: "Respondes y queda montado",
    texto: "Te entrevista por bloques, con un valor por defecto en cada pregunta. Confirmas el resumen e instala, personaliza y verifica el proyecto.",
  },
];

const modos = [
  { modo: "Agente", ias: iasAgente.join(", "), resultado: "Idéntico a la demo. Copia el kit, aplica PERSONALIZAR.md, monta la base de datos y despliega." },
  { modo: "Chat", ias: iasChat.join(", "), resultado: "Te guía paso a paso y te da los archivos personalizados uno a uno; tú los pegas." },
  { modo: "Sin kit", ias: "Cualquiera", resultado: "Reconstruye desde SPEC.md: fiel en diseño y funciones, pero no idéntico línea a línea." },
];

const reglas = [
  ["Entrevista primero", "Por bloques cortos, nunca más de 6 preguntas por mensaje. Cada pregunta trae su valor por defecto."],
  ["Resumen y confirmación", "Antes de tocar nada te enseña lo que va a hacer y espera tu «sí». Tus datos quedan guardados en un archivo."],
  ["El diseño no se toca", "Solo cambian tus datos y tus textos de marca. Los colores, si se lo pides."],
  ["Nunca inventa datos", "Ni reseñas, ni cifras, ni clientes. Si falta un dato, la sección se oculta o se queda el texto neutro."],
  ["Tus claves, en tu equipo", "Solo van a .env.local. No se escriben en el chat ni en el código."],
  ["Verifica al final", "El proyecto compila, arranca y pasa una checklist antes de darse por montado."],
] as const;

export default function Inicio() {
  const etiquetas = productos.map(datosEtiqueta);
  const filas: FilaManifiesto[] = productos.map((p) => ({
    slug: p.slug,
    codigo: p.codigo,
    titulo: nombreCorto(p.titulo),
    subtitulo: p.subtitulo,
    categoria: p.categoria,
    nombreCategoria: nombreCategoria(p.categoria),
    stack: p.stack,
    tiempo: p.tiempoInstalacion.split("·")[0].trim(),
    precio: formatoPrecio(p.precio),
    borrador: Boolean(p.precioBorrador),
    dificultad: p.dificultad,
  }));

  return (
    <>
      {/* Portada: titular a la izquierda, la etiqueta real del paquete a la derecha. */}
      <section className={`${contenedor} grid gap-12 pt-10 pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,30rem)] lg:gap-16 lg:pt-20 lg:pb-24`}>
        <div className="flex flex-col">
          <h1 className="rotulo text-[clamp(3.4rem,10.5vw,6rem)]">
            Proyectos completos.
            <br />
            <span className="text-tinta-2">Tu IA los monta</span>
            <br />
            con tus datos.
          </h1>
          <p className="mt-7 max-w-[34rem] text-lg text-tinta-2">
            Cada paquete trae un prompt maestro y el código original verificado. Lo pegas en tu IA, respondes a sus
            preguntas y el proyecto queda montado igual que la demo, con tu marca.{" "}
            <span className="text-tinta">Como una librería de componentes, pero de proyectos enteros.</span>
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="#catalogo"
              className="pulsable inline-flex min-h-12 items-center gap-2 bg-senal px-5 font-bold text-sobre-senal hover:bg-tinta hover:text-suelo"
            >
              Ver el catálogo
              <ArrowDown size={16} weight="bold" aria-hidden="true" />
            </Link>
            <Link href="#como-funciona" className="inline-flex min-h-12 items-center text-tinta underline decoration-tinta-3 hover:decoration-tinta">
              Cómo funciona
            </Link>
          </div>
          <dl className="mt-auto grid grid-cols-1 gap-x-8 gap-y-3 border-t border-linea pt-6 text-sm sm:grid-cols-2 max-lg:mt-12">
            <div>
              <dt className="campo">Agentes</dt>
              <dd className="mt-1 text-tinta-2">{iasAgente.join(" · ")}</dd>
            </div>
            <div>
              <dt className="campo">Chats</dt>
              <dd className="mt-1 text-tinta-2">{iasChat.join(" · ")}</dd>
            </div>
          </dl>
        </div>
        <div className="lg:pt-2">
          <EtiquetaRotativa etiquetas={etiquetas} />
        </div>
      </section>

      {/* Ruta de seguimiento: tres paradas reales del envío. */}
      <section id="como-funciona" aria-labelledby="t-ruta" className="border-y border-linea bg-placa">
        <div className={`${contenedor} py-16 lg:py-24`}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
            <h2 id="t-ruta" className="rotulo text-[clamp(2.5rem,6vw,4.25rem)]">
              Cómo funciona
            </h2>
            <p className="max-w-[40rem] text-lg text-tinta-2 lg:pt-2">
              No compras un prompt que genera algo parecido. Compras el proyecto: el prompt no lo reinventa, lo instala y
              lo personaliza. Por eso el resultado es 1:1.
            </p>
          </div>

          <ol className="mt-14 grid gap-0 md:grid-cols-3">
            {paradas.map((p, i) => (
              <li key={p.titulo} className="relative border-t-2 border-tinta pt-6 pb-8 md:pr-10">
                {/* Hito de la ruta sobre la línea: el último es el destino. */}
                <span
                  aria-hidden="true"
                  className={`absolute -top-[7px] left-0 size-3 ${i === paradas.length - 1 ? "bg-senal" : "border-2 border-tinta bg-placa"}`}
                />
                <h3 className="rotulo-medio text-2xl tracking-[0.02em]">
                  <span className="cifras mr-2 text-tinta-3">{i + 1}</span>
                  {p.titulo}
                </h3>
                <p className="mt-3 max-w-[30rem] text-tinta-2">{p.texto}</p>
              </li>
            ))}
          </ol>

          {/* Fragmento real del prompt de Ice Gym: así pregunta la IA. */}
          <figure className="mt-6 grid gap-6 border border-linea bg-suelo lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <figcaption className="p-5 sm:p-6">
              <p className="rotulo-medio text-xl tracking-[0.02em]">Así empieza la entrevista de Ice Gym</p>
              <p className="mt-3 max-w-[30rem] text-sm text-tinta-2">
                Texto literal del prompt. Entre corchetes, el valor que se queda si respondes «vale».
              </p>
            </figcaption>
            <pre className="overflow-x-auto border-t border-linea p-5 font-mono text-[0.8125rem] leading-6 text-tinta-2 sm:p-6 lg:border-t-0 lg:border-l">
              <code>
                <span className="text-tinta">Bloque 1 · Marca</span>
                {"\n"}1. Nombre comercial del gimnasio <span className="text-senal-texto">[Ice Gym]</span>
                {"\n"}3. Color de acento <span className="text-senal-texto">[#5CE1FF, azul hielo]</span>
                {"\n"}4. Dominio web y slug corto <span className="text-senal-texto">[icegym.es / icegym]</span>
                {"\n\n"}
                <span className="text-tinta">Bloque 3 · Tarifas</span> (de 1 a 4)
                {"\n"}«¿Hay permanencia?» <span className="text-senal-texto">[no]</span>
              </code>
            </pre>
          </figure>
        </div>
      </section>

      {/* Modos de trabajo según la IA del comprador. */}
      <section aria-labelledby="t-modos" className={`${contenedor} py-16 lg:py-24`}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div>
            <h2 id="t-modos" className="rotulo text-[clamp(2.5rem,6vw,4.25rem)]">
              Con tu IA
            </h2>
            <p className="mt-5 max-w-[26rem] text-tinta-2">
              El prompt detecta con qué trabaja y se adapta. No necesitas una IA concreta ni una suscripción nueva.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">Resultado según el tipo de IA</caption>
              <thead>
                <tr className="border-b border-tinta">
                  <th scope="col" className="campo w-28 py-3 pr-4">Modo</th>
                  <th scope="col" className="campo w-[38%] py-3 pr-4">IA</th>
                  <th scope="col" className="campo py-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {modos.map((m) => (
                  <tr key={m.modo} className="border-b border-linea align-top">
                    <th scope="row" className="rotulo-medio py-4 pr-4 text-lg tracking-[0.02em]">
                      {m.modo}
                    </th>
                    <td className="py-4 pr-4 text-sm text-tinta-2">{m.ias}</td>
                    <td className="py-4 text-tinta-2">{m.resultado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Catálogo: el manifiesto de carga. */}
      <section id="catalogo" aria-labelledby="t-catalogo" className={`${contenedor} scroll-mt-20 py-8 lg:py-12`}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="t-catalogo" className="rotulo text-[clamp(3rem,8vw,5.5rem)]">
            Catálogo
          </h2>
          <p className="max-w-[28rem] text-sm text-tinta-2">
            Cada línea es un paquete con su código. Los precios son de lanzamiento y aún pueden cambiar.
          </p>
        </div>
        <Manifiesto filas={filas} categorias={categorias.map((c) => ({ id: c, nombre: nombreCategoria(c) }))} />
      </section>

      {/* Reglas comunes a todos los prompts. */}
      <section aria-labelledby="t-reglas" className={`${contenedor} py-16 lg:py-24`}>
        <h2 id="t-reglas" className="rotulo max-w-[18ch] text-[clamp(2.5rem,6vw,4.25rem)]">
          Lo que cumplen todos los prompts
        </h2>
        <dl className="mt-10 grid border-t border-tinta sm:grid-cols-2 lg:grid-cols-3">
          {reglas.map(([t, d]) => (
            <div key={t} className="border-b border-linea py-6 sm:pr-8">
              <dt className="rotulo-medio text-lg tracking-[0.02em]">{t}</dt>
              <dd className="mt-2 max-w-[34ch] text-tinta-2">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="t-faq" className={`${contenedor} grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16 lg:py-12`}>
        <h2 id="t-faq" className="rotulo text-[clamp(2.5rem,6vw,4.25rem)]">
          Preguntas
        </h2>
        <Faq preguntas={faqGeneral} />
      </section>

      {/* Cierre en campo de señal: el color a escala de página, una sola vez. */}
      <section aria-labelledby="t-cierre" className="mt-16 bg-senal text-sobre-senal">
        <div className={`${contenedor} flex flex-col gap-8 py-14 lg:flex-row lg:items-end lg:justify-between lg:py-20`}>
          <h2 id="t-cierre" className="rotulo max-w-[16ch] text-[clamp(2.75rem,7vw,5.5rem)]">
            Tu próximo proyecto ya está empaquetado.
          </h2>
          <Link
            href="#catalogo"
            className="pulsable inline-flex min-h-12 shrink-0 items-center gap-2 self-start bg-sobre-senal px-5 font-bold text-[#edebe6] lg:self-auto"
          >
            Elegir paquete
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
