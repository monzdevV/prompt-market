"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

export function InviteForm({ signupUrl }: { signupUrl: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [link, setLink] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { code } = await api<{ code: string }>("/api/admin/invites", { body: { note } });
      setLink(`${signupUrl}?invitacion=${encodeURIComponent(code)}`);
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor="note">
            Para quién (nota interna)
          </label>
          <input id="note" className="input w-64" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-primary">Crear invitación</button>
      </form>
      {link && (
        <div className="rounded-lg bg-ok-soft p-3 text-sm">
          <p className="mb-1 font-medium text-ok">Enlace de invitación (válido 14 días, un solo uso). Solo se muestra ahora:</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all">{link}</code>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Copiado"))}
            >
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
