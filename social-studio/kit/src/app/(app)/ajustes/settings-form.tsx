"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import type { Settings } from "@/lib/settings";

const FIELDS: { key: keyof Settings; label: string; hint: string; max: number; area?: boolean; placeholder?: string }[] = [
  { key: "sector", label: "Sector / nicho", hint: "Ej.: escuela de patinaje sobre hielo en Madrid", max: 300 },
  { key: "audience", label: "Público objetivo", hint: "Ej.: padres con hijos de 6 a 16 años que quieren empezar a patinar", max: 300 },
  {
    key: "language",
    label: "Idioma de los textos",
    hint: "Déjalo vacío para usar el mismo idioma que se habla en el vídeo.",
    placeholder: "Igual que el vídeo",
    max: 50,
  },
  { key: "tone", label: "Tono", hint: "Ej.: cercano y profesional, divertido, técnico", max: 200 },
  {
    key: "extraKeywords",
    label: "Palabras clave de tu marca",
    hint: "Separadas por comas. La IA las usará cuando encajen con el vídeo.",
    area: true,
    max: 500,
  },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/settings", { body: values });
      toast.success("Ajustes guardados. Se aplicarán a los próximos vídeos.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card space-y-5 p-6">
      {FIELDS.map((f) => {
        const props = {
          id: f.key,
          className: "input",
          maxLength: f.max,
          placeholder: f.placeholder,
          "aria-describedby": `${f.key}-hint`,
          value: values[f.key],
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [f.key]: e.target.value }),
        };
        return (
          <div key={f.key}>
            <label className="label" htmlFor={f.key}>
              {f.label}
            </label>
            {f.area ? <textarea rows={3} {...props} /> : <input {...props} />}
            <p id={`${f.key}-hint`} className="hint mt-1">
              {f.hint}
            </p>
          </div>
        );
      })}
      <button className="btn-primary" disabled={saving}>
        {saving && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
