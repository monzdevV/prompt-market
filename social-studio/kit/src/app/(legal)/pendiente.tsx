import { legalInfo } from "@/lib/legal";

/** Muestra un dato del titular o, si aún no está configurado, un aviso visible (nunca un dato inventado). */
export function Dato({ value, label }: { value: string; label: string }) {
  if (value) return <>{value}</>;
  return <span className="rounded bg-warn-soft px-1.5 py-0.5 font-mono text-xs text-warn">[pendiente: {label}]</span>;
}

/** Aviso arriba de cada página legal mientras falten datos del titular. */
export function AvisoPendiente() {
  const { missing } = legalInfo();
  if (!missing.length) return null;
  return (
    <p role="note" className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-xs text-warn">
      Faltan datos del titular por completar: {missing.join(", ")}. Hasta entonces este texto no es definitivo.
    </p>
  );
}
