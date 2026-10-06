import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Logo } from "@/components/ui";
import { BillingButton } from "@/components/billing-button";
import { billingEnabled, priceLabel } from "@/lib/billing";
import { PLANS, type PlanKey } from "@/lib/plans";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Planes" };

const ORDER: PlanKey[] = ["free", "pro", "business"];

export default async function PreciosPage() {
  const enabled = billingEnabled();
  const session = await getSession();
  // Los importes se leen de Stripe (no se escriben a mano en el código)
  const labels = { pro: enabled ? await priceLabel("pro") : null, business: enabled ? await priceLabel("business") : null };
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <Link href={session ? "/panel" : "/registro"} className="btn-primary">
          {session ? "Ir al panel" : "Empezar gratis"}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <p className="eyebrow mt-10 text-center">Planes</p>
        <h1 className="display mt-3 text-center text-5xl leading-tight md:text-6xl">
          Gratis para publicar. <span className="italic text-muted">IA cuando la quieras.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          El plan Free incluye todo menos la IA: redes, programación, vertical, portadas, formatos, analítica y equipo. Pro y Business solo añaden la
          IA, que transcribe tus vídeos y escribe el título, la descripción y los hashtags.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {ORDER.map((key) => {
            const p = PLANS[key];
            const l = p.limits;
            return (
              <section key={key} className={`card card-hover flex flex-col p-7 ${key === "pro" ? "border-accent/50 shadow-[0_0_60px_-30px_var(--accent)]" : ""}`}>
                <div className="flex items-center justify-between">
                  <h2 className="eyebrow">{p.name}</h2>
                  {key === "pro" && <span className="rounded-full brand-bg px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-white uppercase [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]">Recomendado</span>}
                </div>
                <p className="display mt-4 text-4xl">{key === "free" ? "Gratis" : (labels[key] ?? "Próximamente")}</p>
                <p className="mt-1 text-sm text-muted">{p.tagline}</p>
                <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-6 text-sm text-muted">
                  {[
                    // Lo único que cambia entre planes es la IA; el resto es igual en los tres
                    l.aiGenerationsPerMonth > 0
                      ? `IA: transcripción, título, descripción y hashtags (${l.aiGenerationsPerMonth} vídeos al mes)`
                      : "Todo incluido menos la IA (el texto lo escribes tú)",
                    "Vídeos ilimitados",
                    `Hasta ${l.socialAccounts} cuentas conectadas`,
                    "Programación y calendario",
                    "Convertir a vertical, portadas y todos los formatos",
                    `Analítica con ${Math.round(l.historyDays / 365)} años de histórico`,
                    `${l.teamMembers} personas en el equipo y ${l.brands} marcas`,
                    `${Math.round(l.storageMb / 1024)} GB para vídeos`,
                  ].map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                {key === "free" ? (
                  <Link href={session ? "/panel" : "/registro"} className="btn-ghost mt-6">
                    {session ? "Ir al panel" : "Empezar gratis"}
                  </Link>
                ) : enabled && labels[key] ? (
                  session ? (
                    <BillingButton plan={key} className={`mt-6 ${key === "pro" ? "btn-primary" : "btn-ghost"}`}>
                      Suscribirme a {p.name}
                    </BillingButton>
                  ) : (
                    <Link href="/registro" className={`mt-6 ${key === "pro" ? "btn-primary" : "btn-ghost"}`}>
                      Crear cuenta y suscribirme
                    </Link>
                  )
                ) : (
                  <Link href="/contacto" className={`mt-6 ${key === "pro" ? "btn-primary" : "btn-ghost"}`}>
                    Avisadme cuando esté
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
