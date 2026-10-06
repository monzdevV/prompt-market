import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumn, ExternalLink, Link2 } from "lucide-react";
import { ConnectionPill, ago, connectionHelp } from "@/components/connection-status";
import { LineChart, dayRange } from "@/components/line-chart";
import { MetricCard, MetricCell } from "@/components/metric";
import { RefreshStats } from "@/components/refresh-stats";
import { EmptyState, fmtNum, PageHeader, PLATFORM, PlatformDot } from "@/components/ui";
import {
  accountDailyTotals,
  accountsOverview,
  aggregate,
  analyticsRanges,
  followersSeries,
  pickAnalyticsRange,
  postsWithMetrics,
  workspaceTz,
} from "@/lib/analytics";
import type { Platform } from "@/lib/db";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Analítica" };

/** "2026-09-12" → "12 sept" (día guardado tal cual, sin conversión de zona) */
const fmtDay = (day: string) => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
const TABS: { key: "resumen" | Platform; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X" },
];

/** Qué métricas ofrece cada red a través de su API (para decir "no disponible" en vez de mostrar 0). */
const AVAILABLE: Record<Platform, { reach: boolean; shares: boolean; saves: boolean; views: boolean; followersLabel: string }> = {
  instagram: { reach: true, shares: true, saves: true, views: true, followersLabel: "Seguidores" },
  tiktok: { reach: false, shares: true, saves: false, views: true, followersLabel: "Seguidores" },
  youtube: { reach: false, shares: false, saves: false, views: true, followersLabel: "Suscriptores" },
  facebook: { reach: false, shares: false, saves: false, views: false, followersLabel: "Seguidores" },
  linkedin: { reach: false, shares: false, saves: false, views: false, followersLabel: "Seguidores" },
  x: { reach: false, shares: true, saves: false, views: true, followersLabel: "Seguidores" },
};

export default async function AnaliticaPage({ searchParams }: PageProps<"/analitica">) {
  const s = await requireSession();
  const sp = await searchParams;
  // Mismo histórico en todos los planes (Free incluido): solo la IA es de pago
  const ranges = analyticsRanges(s.workspaceId);
  const days = pickAnalyticsRange(s.workspaceId, sp.d);
  const tab = TABS.find((t) => t.key === sp.red)?.key ?? "resumen";
  const accounts = accountsOverview(s.workspaceId, days);
  const connected = new Set(accounts.map((a) => a.platform));
  const link = (over: Record<string, string | number>) => `?${new URLSearchParams({ red: tab, d: String(days), ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <>
      <PageHeader title="Analítica" sub="Datos sincronizados de tus redes. Se actualizan solos cada pocas horas.">
        <nav aria-label="Periodo" className="flex gap-1.5">
          {ranges.map((r) => (
            <Link key={r} href={link({ d: r })} aria-current={r === days ? "page" : undefined} className={r === days ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
              {r >= 365 ? `${r / 365} ${r === 365 ? "año" : "años"}` : `${r} días`}
            </Link>
          ))}
        </nav>
        <RefreshStats />
      </PageHeader>

      <nav aria-label="Redes" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.filter((t) => t.key === "resumen" || connected.has(t.key as Platform)).map((t) => (
          <Link
            key={t.key}
            href={link({ red: t.key })}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap ${tab === t.key ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!accounts.length ? (
        <EmptyState icon={<Link2 size={18} aria-hidden />} title="Conecta una red para ver su analítica" action={{ href: "/cuentas", label: "Conectar redes" }}>
          Traemos tus seguidores, publicaciones y métricas (también de lo que publicaste fuera de la app) y guardamos el histórico día a día.
        </EmptyState>
      ) : tab === "resumen" ? (
        <Overview workspaceId={s.workspaceId} days={days} accounts={accounts} link={link} />
      ) : (
        <PlatformView workspaceId={s.workspaceId} days={days} platform={tab} accounts={accounts.filter((a) => a.platform === tab)} accountParam={sp.cuenta} />
      )}
    </>
  );
}

function Overview({
  workspaceId,
  days,
  accounts,
  link,
}: {
  workspaceId: string;
  days: number;
  accounts: ReturnType<typeof accountsOverview>;
  link: (o: Record<string, string>) => string;
}) {
  const posts = postsWithMetrics(workspaceId, { days });
  const withFollowers = accounts.filter((a) => a.followers !== null);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Publicaciones en el periodo" value={posts.length} />
        <MetricCard label="Visualizaciones" agg={aggregate(posts, "views")} />
        <MetricCard label="Me gusta" agg={aggregate(posts, "likes")} />
        <MetricCard label="Comentarios" agg={aggregate(posts, "comments")} />
      </div>
      <section className="card">
        <h2 className="border-b border-line p-4 font-semibold">Tus redes</h2>
        <ul className="divide-y divide-line">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <PlatformDot platform={a.platform} />
              <Link href={link({ red: a.platform, cuenta: String(a.id) })} className="min-w-0 flex-1 truncate font-medium hover:underline">
                {a.name}
              </Link>
              <span className="w-40 text-right tabular-nums">
                {a.followers === null ? <span className="text-muted">— {AVAILABLE[a.platform].followersLabel.toLowerCase()}</span> : `${fmtNum(a.followers)} ${AVAILABLE[a.platform].followersLabel.toLowerCase()}`}
              </span>
              <span className={`w-20 text-right tabular-nums ${a.followersDelta && a.followersDelta > 0 ? "text-ok" : a.followersDelta && a.followersDelta < 0 ? "text-bad" : "text-muted"}`}>
                {a.followersDelta === null ? "—" : `${a.followersDelta > 0 ? "+" : ""}${fmtNum(a.followersDelta)}`}
              </span>
              <ConnectionPill state={a.state} />
            </li>
          ))}
        </ul>
        {withFollowers.length < accounts.length && (
          <p className="border-t border-line p-3 text-xs text-muted">
            «—» significa que aún no hay datos sincronizados o que la red no ofrece ese dato; nunca lo mostramos como 0.
          </p>
        )}
      </section>
    </div>
  );
}

function PlatformView({
  workspaceId,
  days,
  platform,
  accounts,
  accountParam,
}: {
  workspaceId: string;
  days: number;
  platform: Platform;
  accounts: ReturnType<typeof accountsOverview>;
  accountParam: string | string[] | undefined;
}) {
  if (!accounts.length) {
    return (
      <EmptyState icon={<ChartColumn size={18} aria-hidden />} title={`No tienes ${PLATFORM[platform].label} conectado`} action={{ href: "/cuentas", label: `Conectar ${PLATFORM[platform].label}` }} />
    );
  }
  const account = accounts.find((a) => String(a.id) === accountParam) ?? accounts[0];
  const avail = AVAILABLE[platform];
  const posts = postsWithMetrics(workspaceId, { accountId: account.id, days });
  const series = followersSeries(workspaceId, account.id, days);
  const daily = accountDailyTotals(workspaceId, [account.id], days);
  const notAvailable = `${PLATFORM[platform].label} no ofrece este dato`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {accounts.length > 1 && (
          <nav aria-label="Cuenta" className="flex flex-wrap gap-1.5">
            {accounts.map((a) => (
              <Link key={a.id} href={`?red=${platform}&d=${days}&cuenta=${a.id}`} className={a.id === account.id ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
                {a.name}
              </Link>
            ))}
          </nav>
        )}
        <ConnectionPill state={account.state} />
        <span className="text-xs text-muted">{connectionHelp(account.state, platform, account.last_synced_at, account.rate_limited_until)}</span>
        {account.state === "NEEDS_REAUTHORIZATION" && (
          <a href={`/api/oauth/${platform === "instagram" || platform === "facebook" ? "meta" : platform}/start`} className="btn-primary btn-sm">
            Reconectar {PLATFORM[platform].label}
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label={avail.followersLabel} value={account.followers} unavailable={account.followersDay ? undefined : "Aún sin sincronizar"} />
        <MetricCard
          label={account.followersSince ? `Variación desde el ${fmtDay(account.followersSince)}` : `Variación (${days} días)`}
          value={account.followersDelta}
          unavailable="Hace falta más histórico"
        />
        <MetricCard label="Visualizaciones" agg={avail.views ? aggregate(posts, "views") : undefined} value={avail.views ? undefined : null} unavailable={avail.views ? undefined : notAvailable} />
        <MetricCard label="Alcance diario (suma)" value={avail.reach ? daily.reach : null} unavailable={avail.reach ? "Aún sin datos diarios" : notAvailable} />
        <MetricCard label="Me gusta" agg={aggregate(posts, "likes")} />
        <MetricCard label="Comentarios" agg={aggregate(posts, "comments")} />
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{avail.followersLabel}</h2>
        <LineChart label={avail.followersLabel} points={series.map((p) => ({ day: p.day, value: p.followers }))} days={dayRange(days, workspaceTz(workspaceId))} />
      </section>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-line p-4 font-semibold">Publicaciones ({posts.length})</h2>
        {posts.length ? (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-3 font-medium">Publicación</th>
                <th className="p-3 text-right font-medium">Vistas</th>
                <th className="p-3 text-right font-medium">Me gusta</th>
                <th className="p-3 text-right font-medium">Coment.</th>
                <th className="p-3 text-right font-medium">Compartidos</th>
                {avail.saves && <th className="p-3 text-right font-medium">Guardados</th>}
              </tr>
            </thead>
            <tbody>
              {[...posts]
                .sort((a, b) => (b.views ?? -1) - (a.views ?? -1))
                .map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="max-w-80 p-3">
                      <p className="line-clamp-1">{p.caption || <span className="text-muted">(sin texto)</span>}</p>
                      <p className="text-xs text-muted">
                        {p.published_at ? new Date(p.published_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : ""}
                        {p.permalink && (
                          <a href={p.permalink} target="_blank" rel="noreferrer noopener" className="ml-2 inline-flex items-center gap-0.5 text-accent hover:underline">
                            Ver <ExternalLink size={10} aria-hidden />
                          </a>
                        )}
                      </p>
                    </td>
                    <td className="p-3 text-right">{avail.views ? <MetricCell value={p.views} /> : <MetricCell value={null} />}</td>
                    <td className="p-3 text-right"><MetricCell value={p.likes} /></td>
                    <td className="p-3 text-right"><MetricCell value={p.comments} /></td>
                    <td className="p-3 text-right"><MetricCell value={avail.shares ? p.shares : null} /></td>
                    {avail.saves && <td className="p-3 text-right"><MetricCell value={p.saves} /></td>}
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-sm text-muted">
            {account.last_synced_at ? `No hay publicaciones en los últimos ${days} días.` : "Aún sin sincronizar: aparecerán en unos minutos."}
          </p>
        )}
        <p className="border-t border-line p-3 text-xs text-muted">
          Datos de {PLATFORM[platform].label}
          {account.last_synced_at ? ` · actualizados ${ago(account.last_synced_at)}` : ""}. «—» = dato no disponible en {PLATFORM[platform].label} o aún sin sincronizar.
          {platform === "tiktok" && " TikTok solo da métricas de vídeos públicos."}
        </p>
      </section>
    </div>
  );
}

