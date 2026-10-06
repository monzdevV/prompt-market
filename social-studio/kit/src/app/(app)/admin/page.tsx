import type { Metadata } from "next";
import { fmtDate, fmtNum, PageHeader, StatCard } from "@/components/ui";
import { adminOverview } from "@/lib/admin";
import { signupMode } from "@/lib/auth";
import { APP_URL } from "@/lib/platforms/common";
import { requireAdmin } from "@/lib/session";
import { InviteForm } from "./invite-form";
import { PlanSelect } from "./plan-select";

export const metadata: Metadata = { title: "Admin" };

const USAGE_LABEL: Record<string, string> = {
  videos_processed: "Vídeos procesados",
  posts_published: "Publicaciones",
  ai_tokens: "Tokens de IA",
};

export default async function AdminPage() {
  await requireAdmin();
  const o = adminOverview();
  const workerOk = o.workerBeat !== null && Date.now() - o.workerBeat < 60_000;

  return (
    <div className="space-y-8">
      <PageHeader title="Administración" sub="Estado de la instalación, invitaciones y trabajos con errores." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Usuarios" value={fmtNum(o.users)} />
        <StatCard label="Cuentas conectadas" value={fmtNum(o.accounts)} />
        <StatCard label="En cola" value={fmtNum(o.queued)} />
        <StatCard label="En marcha" value={fmtNum(o.running)} />
        <StatCard label="Por revisar" value={fmtNum(o.needsReview)} tone={o.needsReview ? "bad" : undefined} />
        <StatCard label="Ejecutor" value={workerOk ? "Activo" : "Parado"} tone={workerOk ? undefined : "bad"} />
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Uso este mes</h2>
        {o.usage.length ? (
          <ul className="flex flex-wrap gap-6 text-sm">
            {o.usage.map((u) => (
              <li key={u.metric}>
                <span className="text-muted">{USAGE_LABEL[u.metric] ?? u.metric}:</span> <b className="tabular-nums">{fmtNum(u.value)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Sin uso todavía.</p>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Invitaciones</h2>
          <p className="text-sm text-muted">
            Registro {signupMode() === "open" ? "abierto a cualquiera" : "solo con invitación"} (variable SIGNUP_MODE).
          </p>
        </div>
        <InviteForm signupUrl={`${APP_URL()}/registro`} />
        {o.invites.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-medium">Nota</th>
                <th className="py-1 font-medium">Creada</th>
                <th className="py-1 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {o.invites.map((i) => (
                <tr key={i.created_at} className="border-t border-line">
                  <td className="py-1.5">{i.note || "—"}</td>
                  <td className="py-1.5 tabular-nums">{fmtDate(i.created_at)}</td>
                  <td className="py-1.5">{i.used_at ? `Usada por ${i.used_by ?? "usuario borrado"}` : i.expires_at < Date.now() ? "Caducada" : "Pendiente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 font-semibold">Espacios de trabajo y planes</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-medium">Espacio</th>
              <th className="py-1 font-medium">Dueña/o</th>
              <th className="py-1 font-medium">Cuentas</th>
              <th className="py-1 font-medium">Plan</th>
            </tr>
          </thead>
          <tbody>
            {o.workspaces.map((w) => (
              <tr key={w.id} className="border-t border-line">
                <td className="py-1.5 pr-3">{w.name}</td>
                <td className="py-1.5 pr-3 text-muted">{w.owner}</td>
                <td className="py-1.5 pr-3 tabular-nums">{w.accounts}</td>
                <td className="py-1.5">
                  <PlanSelect workspaceId={w.id} plan={w.plan} label={w.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Trabajos con errores</h2>
        {o.failedJobs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-1 font-medium">Cuándo</th>
                  <th className="py-1 font-medium">Tipo</th>
                  <th className="py-1 font-medium">Usuario</th>
                  <th className="py-1 font-medium">Intentos</th>
                  <th className="py-1 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {o.failedJobs.map((j) => (
                  <tr key={j.id} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">{fmtDate(j.updated_at)}</td>
                    <td className="py-1.5 pr-3">{j.kind === "process_media" ? "IA / transcripción" : j.kind === "sync_account" ? "Sincronización" : "Publicación"}</td>
                    <td className="py-1.5 pr-3">{j.email}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{j.attempts}</td>
                    <td className="py-1.5 text-xs text-bad">{j.last_error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nada que revisar.</p>
        )}
      </section>
    </div>
  );
}
