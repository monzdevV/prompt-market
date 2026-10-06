"use client";

import { useSyncExternalStore } from "react";

const KEY = "manny.checklist.v1";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
// Sin almacenamiento disponible la selección vive en memoria para que las casillas sigan funcionando
let memory: string | null = null;
const snapshot = () => memory ?? read();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
function write(ids: number[]) {
  const json = JSON.stringify(ids);
  memory = json;
  try {
    if (ids.length) localStorage.setItem(KEY, json);
    else localStorage.removeItem(KEY);
  } catch {
    // No se puede guardar: queda solo en pantalla
  }
  listeners.forEach((l) => l());
}

/** Casillas de «Antes de publicar». Se guardan solo en este navegador; sin almacenamiento siguen funcionando. */
export function PublishChecklist({ items }: { items: string[] }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  let ids: number[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) ids = parsed.filter((n): n is number => typeof n === "number");
  } catch {
    // Dato corrupto: se ignora
  }
  const done = new Set(ids);

  function toggle(i: number) {
    const next = new Set(done);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    write([...next]);
  }

  return (
    <div>
      <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
        {items.map((t, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60">
              <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
              <span className={`text-sm text-pretty transition-colors ${done.has(i) ? "text-muted line-through" : ""}`}>{t}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3 px-2">
        <p className="font-mono text-xs text-muted tabular-nums" aria-live="polite">
          {done.size} de {items.length}
        </p>
        {done.size > 0 && (
          <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-fg" onClick={() => write([])}>
            Desmarcar todo
          </button>
        )}
      </div>
    </div>
  );
}
