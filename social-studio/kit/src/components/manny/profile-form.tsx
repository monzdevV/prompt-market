"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

export type ProfileValues = {
  nombre: string;
  tiktok: string;
  instagram: string;
  otras: string;
  nicho: string;
  publico: string;
  tono: string;
  objetivo: string;
  ritmo: string;
  directos: string;
  situacion: string;
  limites: string;
};

type Field = { key: keyof ProfileValues; label: string; help: string; max: number; rows?: number };

// Los límites son los mismos que ProfileSchema (lib/manny/profile.ts); no se importa de allí para no llevar la base de datos al navegador
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Quién eres",
    fields: [
      { key: "nombre", label: "Nombre", help: "Cómo te llama Manny.", max: 80 },
      { key: "tiktok", label: "TikTok", help: "Tu usuario con @. Manny lo usa para tu cuenta en el radar.", max: 60 },
      { key: "instagram", label: "Instagram", help: "Tu usuario con @.", max: 60 },
      { key: "otras", label: "Otras redes", help: "YouTube, Twitch, X… con sus seguidores si quieres.", max: 300, rows: 2 },
    ],
  },
  {
    title: "Qué haces y para quién",
    fields: [
      { key: "nicho", label: "Nicho", help: "De qué va tu contenido.", max: 400, rows: 3 },
      { key: "publico", label: "Público", help: "Quién te ve o quién quieres que te vea.", max: 400, rows: 3 },
      { key: "tono", label: "Tono", help: "Cómo hablas: cercano, chulesco, técnico…", max: 300, rows: 2 },
    ],
  },
  {
    title: "Hacia dónde vas",
    fields: [
      { key: "objetivo", label: "Objetivo", help: "Qué quieres conseguir y para cuándo.", max: 600, rows: 3 },
      { key: "ritmo", label: "Ritmo", help: "Cuánto publicas, a qué horas y cuándo grabas.", max: 300, rows: 2 },
      { key: "directos", label: "Directos", help: "Día, hora, duración y tema.", max: 400, rows: 2 },
    ],
  },
  {
    title: "Dónde estás ahora",
    fields: [
      { key: "situacion", label: "Situación", help: "Cifras, lo que mejor te ha funcionado y lo que falla. Cuanto más real, mejores consejos.", max: 3000, rows: 9 },
      { key: "limites", label: "Límites", help: "Lo que Manny nunca debe proponerte.", max: 1000, rows: 3 },
    ],
  },
];

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = (Object.keys(values) as (keyof ProfileValues)[]).some((k) => values[k] !== saved[k]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    try {
      await api("/api/manny/profile", { body: values });
      setSaved(values);
      toast.success("Perfil guardado. Manny ya lo tiene en cuenta.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-12">
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="min-w-0">
          <legend className="display mb-5 text-3xl">{g.title}</legend>
          <div className="grid gap-5 md:grid-cols-2">
            {g.fields.map((f) => {
              const v = values[f.key];
              const near = v.length > f.max * 0.8;
              const wide = (f.rows ?? 1) > 2 || f.key === "otras";
              return (
                <div key={f.key} className={wide ? "md:col-span-2" : ""}>
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={`p-${f.key}`} className="label !mb-0">
                      {f.label}
                    </label>
                    {near && (
                      <span className={`font-mono text-xs tabular-nums ${v.length >= f.max ? "text-bad" : "text-muted"}`} aria-live="polite">
                        {v.length} / {f.max}
                      </span>
                    )}
                  </div>
                  <p id={`p-${f.key}-h`} className="hint mt-0.5 mb-1.5">
                    {f.help}
                  </p>
                  {f.rows ? (
                    <textarea id={`p-${f.key}`} aria-describedby={`p-${f.key}-h`} rows={f.rows} maxLength={f.max} value={v} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} className="input resize-y" />
                  ) : (
                    <input id={`p-${f.key}`} aria-describedby={`p-${f.key}-h`} maxLength={f.max} value={v} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} className="input" />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border md:px-5">
        <button type="submit" disabled={!dirty || saving} className="btn-primary">
          {saving && <LoaderCircle size={15} aria-hidden className="animate-spin" />} Guardar perfil
        </button>
        <p className="text-sm text-muted" aria-live="polite">
          {dirty ? "Tienes cambios sin guardar." : (
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} aria-hidden className="text-ok" /> Todo guardado
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
