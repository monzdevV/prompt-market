import { ArrowUpRight, Clock } from "@phosphor-icons/react/dist/ssr";

/**
 * Compra con Stripe Payment Link (definido en producto.json). Sin claves ni backend.
 * Si el enlace está vacío o no es de Stripe, el botón queda deshabilitado como «Próximamente».
 */
export function BotonCompra({ id, enlace, precio, titulo }: { id: string; enlace: string; precio: string; titulo: string }) {
  const valido = /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(enlace);
  if (!valido) {
    return (
      <div>
        <button
          type="button"
          disabled
          aria-describedby={`${id}-nota`}
          className="inline-flex min-h-13 w-full cursor-not-allowed items-center justify-center gap-2 border-[1.5px] border-dashed border-tinta-3 px-5 text-base font-semibold text-tinta-2"
        >
          <Clock size={18} weight="bold" aria-hidden="true" />
          Próximamente
        </button>
        <p id={`${id}-nota`} className="mt-2 text-xs text-tinta-3">
          La compra de {titulo} aún no está abierta.
        </p>
      </div>
    );
  }
  return (
    <a
      href={enlace}
      rel="noopener"
      className="pulsable inline-flex min-h-13 w-full items-center justify-center gap-2 bg-senal px-5 text-base font-bold text-sobre-senal hover:bg-tinta hover:text-suelo"
    >
      Comprar por {precio}
      <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
      <span className="sr-only">(abre el pago seguro de Stripe)</span>
    </a>
  );
}
