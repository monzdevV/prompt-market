import { imagenOG, tamanoOG } from "@/lib/og";
import { formatoPrecio, nombreCorto, productoPorSlug, productos } from "@/lib/catalogo";

export const alt = "Ficha del paquete";
export const size = tamanoOG;
export const contentType = "image/png";

export function generateStaticParams() {
  return productos.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) return new Response("No encontrado", { status: 404 });
  return imagenOG({
    codigo: p.codigo,
    titulo: nombreCorto(p.titulo),
    linea: p.readme.tipo || p.subtitulo,
    pie: `${formatoPrecio(p.precio)} · ${p.tiempoInstalacion.split("·")[0].trim()}`,
  });
}
