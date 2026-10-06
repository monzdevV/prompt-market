"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { api } from "@/lib/client-api";
import { scriptToText } from "@/lib/manny/format";
import type { PlanScript } from "@/lib/manny/types";
import { CopyButton } from "./copy-button";
import { ScriptBody } from "./script-card";

/** El enfoque es un nombre corto; si Manny escribe una frase, se queda con lo que va antes de los dos puntos o el paréntesis. */
const tabLabel = (s: string) => {
  const t = s.split(/[:(—–]/)[0].trim() || s;
  return t.length > 24 ? `${t.slice(0, 23).trimEnd()}…` : t;
};

export type Version = Omit<PlanScript, "id" | "dia" | "hora" | "referencia"> & { enfoque: string; queCambia: string };

/** Las tres versiones del guion: una pestaña por enfoque, con todo listo para copiar y guardar. */
export function VersionTabs({ remixId, versions }: { remixId: string; versions: Version[] }) {
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, i: number) {
    const next = e.key === "ArrowRight" ? (i + 1) % versions.length : e.key === "ArrowLeft" ? (i - 1 + versions.length) % versions.length : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  async function save(i: number) {
    setSaving(i);
    try {
      const { id } = await api<{ id: string }>(`/api/manny/remix/${remixId}/save`, { body: { index: i } });
      setSaved((s) => ({ ...s, [i]: id }));
      toast.success("Guardado en Guiones");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Versiones del guion" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {versions.map((v, i) => (
          <button
            key={i}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`ver-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`ver-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative shrink-0 px-4 py-3 text-sm whitespace-nowrap transition-colors duration-200 ${active === i ? "text-fg" : "text-muted hover:text-fg"}`}
          >
            {tabLabel(v.enfoque)}
            <span aria-hidden className={`absolute inset-x-4 -bottom-px h-[2px] rounded-full bg-accent transition-[opacity,transform] duration-200 [transition-timing-function:var(--ease)] ${active === i ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0"}`} />
          </button>
        ))}
      </div>

      {versions.map((v, i) => (
        <div key={i} role="tabpanel" id={`ver-panel-${i}`} aria-labelledby={`ver-tab-${i}`} hidden={active !== i} className="pt-6">
          <h3 className="display text-3xl text-balance">{v.titulo}</h3>
          <p className="mt-1 text-sm text-muted">
            {v.formato}
            {v.etiquetas.length > 0 && ` · ${v.etiquetas.join(" · ")}`}
          </p>
          {v.queCambia && <p className="mt-3 max-w-2xl text-sm text-pretty text-muted">{v.queCambia}</p>}
          <div className="mt-6">
            <ScriptBody script={{ ...v, dia: null, hora: null, referencia: null }} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <CopyButton text={() => scriptToText(v)} label="Copiar guion entero" className="btn-primary btn-sm" />
            {saved[i] ? (
              <Link href={`/manny/guiones#${saved[i]}`} className="btn-ghost btn-sm text-ok">
                <Check size={13} aria-hidden /> Guardado · verlo en Guiones
              </Link>
            ) : (
              <button type="button" disabled={saving !== null} onClick={() => save(i)} className="btn-ghost btn-sm">
                <BookmarkPlus size={13} aria-hidden /> Guardar en Guiones
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeleteRemix({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      onConfirm={async () => {
        try {
          await api(`/api/manny/remix/${id}`, { method: "DELETE" });
          router.push("/manny/copiar");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo borrar");
        }
      }}
    >
      Borrar análisis
    </ConfirmButton>
  );
}
