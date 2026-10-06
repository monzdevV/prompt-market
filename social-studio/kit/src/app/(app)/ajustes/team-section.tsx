"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { api } from "@/lib/client-api";

type Team = {
  members: { id: string; email: string; name: string; role: "owner" | "member" }[];
  invites: { email: string; expires_at: number }[];
};

export function TeamSection({ team, isOwner, limit, meId }: { team: Team; isOwner: boolean; limit: number; meId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const used = team.members.length + team.invites.length;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/team/invites", { body: { email } });
      toast.success(`Invitación enviada a ${email}`);
      setEmail("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo invitar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-4 p-6" aria-labelledby="team">
      <div>
        <h2 id="team" className="font-semibold">
          Equipo
        </h2>
        <p className="text-sm text-muted">
          {used} de {limit} {limit === 1 ? "persona" : "personas"} en tu equipo. Todo el equipo ve y publica en las mismas redes.
        </p>
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line text-sm">
        {team.members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 p-3">
            <span className="min-w-0 flex-1 truncate">
              <b className="font-medium">{m.name || m.email}</b> <span className="text-muted">{m.email}</span>
            </span>
            <span className="text-xs text-muted">{m.role === "owner" ? "Dueña/o" : "Miembro"}</span>
            {isOwner && m.role !== "owner" && m.id !== meId && (
              <ConfirmButton
                onConfirm={async () => {
                  try {
                    await api(`/api/team/members/${m.id}`, { method: "DELETE" });
                    toast.success("Persona retirada del equipo");
                    router.refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "No se pudo quitar");
                  }
                }}
              >
                Quitar
              </ConfirmButton>
            )}
          </li>
        ))}
        {team.invites.map((i) => (
          <li key={i.email} className="flex items-center gap-2 p-3 text-muted">
            <span className="flex-1 truncate">{i.email}</span>
            <span className="text-xs">Invitación pendiente</span>
          </li>
        ))}
      </ul>
      {isOwner &&
        (used < limit ? (
          <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <label className="label" htmlFor="invite-email">
                Invitar por email
              </label>
              <input id="invite-email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary" disabled={busy}>
              Enviar invitación
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">Has llegado al máximo de personas del equipo.</p>
        ))}
    </section>
  );
}
