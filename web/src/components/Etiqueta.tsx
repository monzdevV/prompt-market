import { CodigoBarras } from "./CodigoBarras";
import { TextoRico } from "./TextoRico";
import { marca } from "@/lib/marca";
import type { Producto } from "@/lib/catalogo";
import { formatoBytes, formatoNumero, nombreCorto } from "@/lib/catalogo";

// Lo justo para pintar una etiqueta (se pasa a componentes cliente sin arrastrar el README).
export type DatosEtiqueta = {
  slug: string;
  codigo: string;
  titulo: string;
  tipo: string;
  precio: number;
  tiempo: string;
  preguntas?: number;
  verificacion: string;
  contenido: { ruta: string; detalle: string }[];
  peso: string;
};

export function datosEtiqueta(p: Producto): DatosEtiqueta {
  return {
    slug: p.slug,
    codigo: p.codigo,
    titulo: nombreCorto(p.titulo),
    tipo: p.readme.tipo,
    precio: p.precio,
    tiempo: p.tiempoInstalacion.split("·")[0].trim(),
    preguntas: p.preguntas,
    verificacion: p.readme.verificacion,
    contenido: p.paquete.contenido.map((c) => ({
      ruta: c.ruta,
      detalle:
        c.tipo === "carpeta"
          ? `${formatoNumero(c.archivos)} archivos`
          : c.ruta.endsWith(".json")
            ? formatoBytes(c.bytes)
            : `${formatoNumero(c.lineas)} líneas`,
    })),
    peso: formatoBytes(p.paquete.bytes),
  };
}

/** Etiqueta de expedición. Toda la rejilla usa reglas de 1 px en «tinta». */
export function Etiqueta({ d, id }: { d: DatosEtiqueta; id?: string }) {
  return (
    <article
      id={id}
      aria-label={`Etiqueta del paquete ${d.titulo}`}
      className="relative border border-tinta bg-suelo text-tinta"
    >
      {/* Barra de señal: el único campo de color de la etiqueta. */}
      <div className="flex items-stretch justify-between bg-senal text-sobre-senal">
        <div className="flex flex-col justify-between px-4 py-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">{marca.nombre} · Expedición</span>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">Proyecto completo</span>
        </div>
        <span className="rotulo border-l border-sobre-senal px-4 pt-3 pb-2 text-[3.25rem] leading-[0.8] sm:text-[4rem]">{d.codigo}</span>
      </div>

      <div className="border-b border-tinta px-4 pt-4 pb-3">
        <p className="rotulo text-[2.5rem] sm:text-[3rem]">{d.titulo}</p>
        <p className="mt-1 text-sm text-tinta-2">{d.tipo}</p>
      </div>

      <div className="grid grid-cols-2 border-b border-tinta text-sm">
        <div className="border-r border-tinta px-4 py-3">
          <p className="campo">Remitente</p>
          <p className="mt-1 font-semibold">{marca.nombre}</p>
          <p className="text-tinta-2">Prompt maestro + kit</p>
        </div>
        <div className="px-4 py-3">
          <p className="campo">Destinatario</p>
          <p className="mt-1 font-semibold">Tu IA</p>
          <p className="text-tinta-2">Agente o chat</p>
        </div>
      </div>

      <div className="border-b border-tinta px-4 py-3">
        <p className="campo">Contenido declarado</p>
        <ul className="mt-2 font-mono text-[0.8125rem] leading-6">
          {d.contenido.map((c) => (
            <li key={c.ruta} className="flex items-baseline gap-2">
              <span>{c.ruta}</span>
              <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-tinta-3" />
              <span className="cifras text-tinta-2">{c.detalle}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 border-b border-tinta text-sm">
        <div className="border-r border-tinta px-4 py-3">
          <p className="campo">Peso</p>
          <p className="cifras mt-1 font-semibold">{d.peso}</p>
        </div>
        <div className="px-4 py-3">
          <p className="campo">Montaje</p>
          <p className="cifras mt-1 font-semibold">{d.tiempo}</p>
        </div>
      </div>

      {d.verificacion && (
        <div className="border-b border-tinta px-4 py-3 text-sm">
          <p className="campo">Verificado</p>
          <p className="mt-1 text-tinta-2">
            <TextoRico texto={d.verificacion} />
          </p>
        </div>
      )}

      <div className="flex items-end gap-4 px-4 py-3">
        <CodigoBarras valor={`${d.codigo}-${String(d.precio).padStart(3, "0")}`} className="h-11 w-full max-w-[15rem] text-tinta" />
        <span className="font-mono text-xs text-tinta-3 cifras">
          {d.codigo}-{String(d.precio).padStart(3, "0")}
        </span>
      </div>
    </article>
  );
}
