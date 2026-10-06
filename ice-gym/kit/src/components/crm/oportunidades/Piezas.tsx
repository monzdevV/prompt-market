import { CalendarBlank, PauseCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { MARCA } from "@/marca";
import { accionVencidaB2B, probabilidadB2B, type Oportunidad } from "@/lib/b2b";

/** Piezas pequeñas de oportunidades (server-safe: sin hooks). */

const diaMes = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: MARCA.zonaHoraria });
const diaMesAno = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "2-digit", timeZone: MARCA.zonaHoraria });

/** "12 sept" (o "12 sept 25" si no es de este año). */
export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const f = d.getFullYear() === new Date().getFullYear() ? diaMes : diaMesAno;
  return f.format(d).replace(".", "");
}

function tonoProbabilidad(p: number) {
  if (p >= 60) return "var(--exito)";
  if (p >= 30) return "var(--aviso)";
  return "var(--critico)";
}

/** Probabilidad: barra fina + porcentaje. */
export function Probabilidad({ o, ancho = "w-12" }: { o: Pick<Oportunidad, "etapa" | "probabilidad">; ancho?: string }) {
  const p = probabilidadB2B(o);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Probabilidad ${p} %`}>
      <span className={`h-1.5 ${ancho} overflow-hidden rounded-full bg-linea`} aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${p}%`, backgroundColor: tonoProbabilidad(p) }} />
      </span>
      <span className="text-xs tabular-nums text-tinta-2">{p}%</span>
    </span>
  );
}

/** Próxima acción con su fecha; en rojo si ya venció. */
export function ProximaAccion({
  o,
  compacta = false,
}: {
  o: Pick<Oportunidad, "proxima_accion" | "proxima_accion_fecha" | "etapa">;
  compacta?: boolean;
}) {
  if (!o.proxima_accion && !o.proxima_accion_fecha) {
    return <span className="text-xs text-tinta-2">Sin próxima acción</span>;
  }
  const vencida = accionVencidaB2B(o);
  const Icono = vencida ? WarningCircle : CalendarBlank;
  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-xs ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}>
      <Icono className="size-3.5 shrink-0" weight={vencida ? "fill" : "regular"} aria-hidden />
      {!compacta && <span className="truncate text-tinta">{o.proxima_accion ?? "Seguimiento"}</span>}
      {o.proxima_accion_fecha && (
        <span className="shrink-0 tabular-nums">
          {vencida && <span className="sr-only">Vencida: </span>}
          {compacta && o.proxima_accion ? `${o.proxima_accion} · ` : ""}
          {fechaCorta(o.proxima_accion_fecha)}
        </span>
      )}
    </span>
  );
}

/** Estado sólo cuando aporta algo (la pausa); el resto ya lo dice la etapa. */
export function MarcaEstado({ estado }: { estado: Oportunidad["estado"] }) {
  if (estado !== "en_pausa") return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-tinta-2">
      <PauseCircle className="size-3.5" weight="fill" aria-hidden />
      En pausa
    </span>
  );
}
