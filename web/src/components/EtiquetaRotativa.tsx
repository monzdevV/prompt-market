"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Pause, Play } from "@phosphor-icons/react";
import { Etiqueta, type DatosEtiqueta } from "./Etiqueta";

const INTERVALO = 7000;

function suscribirMovimiento(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const movimientoReducido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** La impresora de etiquetas de la portada: alterna productos y se para al tocarla. */
export function EtiquetaRotativa({ etiquetas }: { etiquetas: DatosEtiqueta[] }) {
  const [activa, setActiva] = useState(0);
  const [pausada, setPausada] = useState(false);
  const [encima, setEncima] = useState(false);
  // La primera etiqueta se ve entera desde el principio; solo se «imprime» al cambiar.
  const [cambiada, setCambiada] = useState(false);
  const reducido = useSyncExternalStore(suscribirMovimiento, movimientoReducido, () => true);
  const corre = !pausada && !encima && !reducido && etiquetas.length > 1;

  useEffect(() => {
    if (!corre) return;
    const t = window.setTimeout(() => {
      setCambiada(true);
      setActiva((i) => (i + 1) % etiquetas.length);
    }, INTERVALO);
    return () => window.clearTimeout(t);
  }, [corre, activa, etiquetas.length]);

  const d = etiquetas[activa];

  return (
    <div
      onPointerEnter={() => setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      onFocusCapture={() => setEncima(true)}
      onBlurCapture={() => setEncima(false)}
    >
      {/* Ranura de la impresora: la etiqueta sale por aquí. */}
      <div className="flex items-center justify-between gap-3 border border-b-0 border-linea bg-placa px-2 py-2">
        <div role="group" aria-label="Elegir paquete" className="flex gap-1">
          {etiquetas.map((e, i) => (
            <button
              key={e.slug}
              type="button"
              aria-pressed={i === activa}
              aria-label={`${e.titulo} (${e.codigo})`}
              onClick={() => {
                setCambiada(true);
                setActiva(i);
                setPausada(true);
              }}
              className={`pulsable rotulo-medio min-h-9 min-w-11 px-2 text-sm tracking-[0.06em] ${
                i === activa ? "bg-tinta text-suelo" : "text-tinta-2 hover:text-tinta"
              }`}
            >
              {e.codigo}
            </button>
          ))}
        </div>
        {!reducido && etiquetas.length > 1 && (
          <button
            type="button"
            onClick={() => setPausada((p) => !p)}
            aria-label={pausada ? "Reanudar el cambio automático de etiqueta" : "Pausar el cambio automático de etiqueta"}
            className="pulsable grid size-9 place-items-center text-tinta-2 hover:text-tinta"
          >
            {pausada ? <Play size={16} weight="bold" /> : <Pause size={16} weight="bold" />}
          </button>
        )}
      </div>
      <div className="relative overflow-hidden" aria-live="polite">
        <div key={d.slug} className={cambiada ? "impresion" : undefined}>
          <Etiqueta d={d} />
        </div>
      </div>
      <Link
        href={`/p/${d.slug}`}
        className="group mt-3 inline-flex items-center gap-2 text-sm text-tinta-2 hover:text-tinta"
      >
        Abrir el albarán de {d.titulo}
        <ArrowRight size={14} weight="bold" className="transition-transform duration-150 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
