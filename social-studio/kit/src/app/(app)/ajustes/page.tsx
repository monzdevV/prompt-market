import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { BillingButton } from "@/components/billing-button";
import { billingEnabled, billingSummary } from "@/lib/billing";
import { db } from "@/lib/db";
import { planHasAi, PLANS, usageSummary } from "@/lib/plans";
import { NO_PASSWORD } from "@/lib/social-auth";
import { requireSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { listTeam, memberRole } from "@/lib/team";
import { DeleteAccount } from "./delete-account";
import { SettingsForm } from "./settings-form";
import { TeamSection } from "./team-section";

export const metadata: Metadata = { title: "Ajustes" };

const USAGE_ROWS = [
  ["socialAccounts", "Cuentas conectadas"],
  ["videosPerMonth", "Vídeos este mes"],
  ["aiGenerationsPerMonth", "Textos de IA este mes"],
  ["teamMembers", "Personas en el equipo"],
  ["storageMb", "Almacenamiento (MB)"],
] as const;

export default async function AjustesPage() {
  const s = await requireSession();
  const usage = usageSummary(s.workspaceId);
  const isOwner = memberRole(s.workspaceId, s.userId) === "owner";
  const billing = billingSummary(s.workspaceId);
  const payments = billingEnabled();
  const aiPlan = planHasAi(s.workspaceId);
  // Quien entró con Google o TikTok no tiene contraseña: confirma el borrado escribiendo BORRAR
  const hasPassword = (db.prepare("SELECT password_hash FROM users WHERE id = ?").get(s.userId) as { password_hash: string } | undefined)?.password_hash !== NO_PASSWORD;
  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Ajustes" sub="Tu plan, tu equipo, tu marca y tu cuenta." />

      <section className="card space-y-4 p-6" aria-labelledby="plan">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="plan" className="font-semibold">
              Plan {PLANS[usage.plan].name}
            </h2>
            <p className="text-sm text-muted">{PLANS[usage.plan].tagline}. Los contadores mensuales se reinician el día 1.</p>
          </div>
          {payments && isOwner && billing.hasCustomer ? (
            <BillingButton className="btn-ghost btn-sm">Gestionar suscripción</BillingButton>
          ) : (
            <Link href="/precios" className={usage.plan === "free" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
              {usage.plan === "free" ? "Añadir la IA" : "Ver planes"}
            </Link>
          )}
        </div>
        {billing.status && billing.renewsAt && (
          <p className="text-sm text-muted">
            {billing.cancelAtPeriodEnd ? "Se cancela" : "Se renueva"} el{" "}
            {new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(billing.renewsAt))}
            {billing.status === "past_due" && " · Hay un pago pendiente: revisa tu tarjeta en «Gestionar suscripción»."}
          </p>
        )}
        <ul className="space-y-3">
          {USAGE_ROWS.map(([key, label]) => {
            const used = usage.used[key];
            const limit = usage.limits[key];
            // Límite 0 = no incluido en el plan (p. ej. la IA en Free): se dice, no se pinta «0 / 0»
            if (limit === 0) {
              return (
                <li key={key} className="flex justify-between text-sm">
                  <span>{label}</span>
                  <Link href="/precios" className="text-accent underline">
                    No incluido · ver planes
                  </Link>
                </li>
              );
            }
            if (!Number.isFinite(limit)) {
              return (
                <li key={key} className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted">{used} · sin límite</span>
                </li>
              );
            }
            const pct = Math.min(100, Math.round((used / limit) * 100));
            return (
              <li key={key} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted">
                    {used} / {limit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad-strong" : "bg-accent-strong"}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        {!payments && <p className="text-xs text-muted">Los pagos se activarán pronto. Si necesitas más, escríbenos desde Contacto.</p>}
      </section>

      <TeamSection team={listTeam(s.workspaceId)} isOwner={isOwner} limit={usage.limits.teamMembers} meId={s.userId} />

      <section className="space-y-3" aria-labelledby="marca">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="marca" className="display text-2xl">
            Tu marca, para la IA
          </h2>
          {!aiPlan && <span className="rounded-full border border-accent/40 px-2 py-0.5 font-mono text-[10px] tracking-widest text-accent uppercase">Pro</span>}
        </div>
        <p className="text-sm text-muted">
          {aiPlan
            ? "Cuanto mejor describas tu marca, más precisas serán las palabras clave y los hashtags de cada vídeo."
            : "Se usa cuando la IA escribe el título, la descripción y los hashtags (planes Pro y Business). Puedes dejarlo preparado."}
        </p>
        <SettingsForm initial={getSettings(s.workspaceId)} />
      </section>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Tu cuenta</h2>
        <p className="mb-4 text-sm text-muted">
          {s.name} · {s.email}
        </p>
        <DeleteAccount hasPassword={hasPassword} />
      </div>
    </div>
  );
}
