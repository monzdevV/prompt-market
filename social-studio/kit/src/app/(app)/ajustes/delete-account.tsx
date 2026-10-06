"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

/** Palabra que se escribe para confirmar cuando la cuenta no tiene contraseña (se entró con Google o TikTok). */
export const DELETE_WORD = "BORRAR";

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = hasPassword ? !!value : value.trim().toUpperCase() === DELETE_WORD;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/me", { method: "DELETE", body: hasPassword ? { password: value } : { confirm: value.trim().toUpperCase() } });
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo borrar la cuenta");
      setBusy(false);
    }
  }

  return (
    <section className="card border-bad/30 p-6" aria-labelledby="danger">
      <h2 id="danger" className="font-semibold text-bad">
        Borrar mi cuenta
      </h2>
      <p className="mt-1 text-sm text-muted">
        Se borran para siempre tus vídeos, publicaciones, métricas y las conexiones con tus redes (y retiramos el acceso en Google y
        TikTok). Lo ya publicado en las redes no se borra.
      </p>
      {!open ? (
        <button className="btn-danger mt-4 border border-bad/30" onClick={() => setOpen(true)}>
          Quiero borrar mi cuenta
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="label" htmlFor="del-pw">
              {hasPassword ? "Escribe tu contraseña para confirmar" : `Escribe ${DELETE_WORD} para confirmar`}
            </label>
            <input
              id="del-pw"
              type={hasPassword ? "password" : "text"}
              autoComplete={hasPassword ? "current-password" : "off"}
              className="input w-64"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <button className="btn bg-bad text-white hover:opacity-90" disabled={busy || !ready}>
            {busy ? "Borrando…" : "Borrar definitivamente"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      )}
    </section>
  );
}
