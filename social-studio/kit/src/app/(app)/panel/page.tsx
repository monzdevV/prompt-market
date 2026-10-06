import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheck, Clapperboard, Plus, TriangleAlert } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PostCard } from "@/components/post-card";
import { EmptyState, fmtDate, fmtNum, PageHeader, PlatformDot, StatCard } from "@/components/ui";
import { listAccounts } from "@/lib/accounts";
import { accountsOverview, aggregate, postsWithMetrics } from "@/lib/analytics";
import { MetricCard } from "@/components/metric";
import { hasAnyMedia } from "@/lib/media";
import { listPosts } from "@/lib/posts";
import { requireSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Panel" };

export default async function PanelPage() {
  const s = await requireSession();
  const accounts = listAccounts(s.workspaceId);
  const posts = listPosts(s.workspaceId, { limit: 300 });
  const settings = getSettings(s.workspaceId);
  const hasVideo = hasAnyMedia(s.workspaceId);

  const upcoming = posts.filter((p) => p.status === "scheduled").sort((a, b) => a.scheduled_at - b.scheduled_at);
  const recent = posts.filter((p) => p.status !== "scheduled").slice(0, 3);
  const monthAgo = Date.now() - 30 * 24 * 3600_000;
  const month = posts.filter((p) => p.scheduled_at >= monthAgo && (p.status === "done" || p.status === "partial"));
  const synced = postsWithMetrics(s.workspaceId, { days: 30 });
  const attention = posts.filter((p) => p.status === "failed" || p.status === "partial").length;

  const steps = [
    { done: accounts.length > 0, label: "Conecta tus redes", sub: "Instagram, TikTok, YouTube, Facebook o X", href: "/cuentas" },
    { done: !!settings.sector, label: "Describe tu marca", sub: "Sector y público: la IA afina las palabras clave", href: "/ajustes" },
    { done: hasVideo, label: "Sube tu primer vídeo", sub: "Se transcribe y se escribe la descripción SEO solo", href: "/nuevo" },
  ];
  const pending = steps.filter((x) => !x.done).length;
  const broken = accountsOverview(s.workspaceId).filter((a) => a.state === "NEEDS_REAUTHORIZATION");

  return (
    <>
      <AutoRefresh active={posts.some((p) => p.status === "publishing")} />
      <PageHeader title={`Hola, ${s.name.split(" ")[0] || "de nuevo"}`}>
        <Link href="/nuevo" className="btn-primary">
          <Plus size={16} aria-hidden /> Nueva publicación
        </Link>
      </PageHeader>

      {broken.length > 0 && (
        <div role="alert" className="card mb-6 flex flex-wrap items-center gap-3 border-bad/40 bg-bad-soft p-4 text-sm text-bad">
          <TriangleAlert size={18} aria-hidden />
          <span className="flex-1">
            {broken.length === 1
              ? `${broken[0].name} necesita que vuelvas a conectarla: no podemos publicar ni leer sus métricas.`
              : `${broken.length} cuentas necesitan que vuelvas a conectarlas.`}
          </span>
          <Link href="/cuentas" className="btn-primary btn-sm">
            Revisar cuentas
          </Link>
        </div>
      )}

      {pending > 0 && (
        <section className="card mb-6 p-5" aria-labelledby="onboarding">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="onboarding" className="font-semibold">
              Primeros pasos
            </h2>
            <span className="text-xs text-muted">
              {steps.length - pending} de {steps.length}
            </span>
          </div>
          <ol className="grid gap-2 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className={`flex h-full items-start gap-3 rounded-lg border p-3 transition-colors ${
                    step.done ? "border-line opacity-60" : "border-line hover:border-accent hover:bg-accent-soft/40"
                  }`}
                >
                  {step.done ? (
                    <CircleCheck size={20} className="mt-0.5 shrink-0 text-ok" aria-label="Hecho" />
                  ) : (
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent mt-0.5">
                      {i + 1}
                    </span>
                  )}
                  <span>
                    <span className={`block text-sm font-medium ${step.done ? "line-through" : ""}`}>{step.label}</span>
                    <span className="block text-xs text-muted">{step.sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Programadas" value={fmtNum(upcoming.length)} />
        <StatCard label="Publicadas (30 días)" value={fmtNum(month.length)} />
        <MetricCard label="Visualizaciones (30 días)" agg={aggregate(synced, "views")} />
        <StatCard label="Necesitan atención" value={fmtNum(attention)} tone={attention ? "bad" : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximas</h2>
            <Link href="/calendario" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              Calendario <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          {upcoming.length ? (
            <ul className="card divide-y divide-line">
              {upcoming.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="w-28 shrink-0 text-muted tabular-nums">{fmtDate(p.scheduled_at)}</span>
                  <span className="line-clamp-1 flex-1">{p.title || p.description}</span>
                  <span className="flex gap-0.5">
                    {p.targets.map((t) => (
                      <PlatformDot key={t.id} platform={t.platform} size={16} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-6 text-center text-sm text-muted">Nada programado.</p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Últimas publicaciones</h2>
            <Link href="/publicaciones" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              Ver todas <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {!recent.length && (
              <EmptyState icon={<Clapperboard size={18} aria-hidden />} title="Todavía no has publicado nada" action={{ href: "/nuevo", label: "Subir un vídeo" }}>
                Sube un vídeo: lo transcribimos y la IA escribe el título, la descripción y los hashtags.
              </EmptyState>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
