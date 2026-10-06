import type { Metadata } from "next";
import Link from "next/link";
import { AnalyzeRadarButton, SaveIdeaButton } from "@/components/manny/idea-actions";
import { AccountsPanel } from "@/components/manny/radar-accounts";
import { VideoRow } from "@/components/manny/video-row";
import { PageHeader } from "@/components/ui";
import { workspaceTz } from "@/lib/analytics";
import { analyzeHref, compact, duration, pct, since } from "@/lib/manny/format";
import { computeInsights, getRadarAnalysis, listTracked, radarFeed, type FeedSort, type RadarInsights } from "@/lib/manny/radar";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Radar" };

const SORTS: { key: FeedSort; label: string }[] = [
  { key: "ratio", label: "Más viral para su tamaño" },
  { key: "views", label: "Más visitas" },
  { key: "saves", label: "Más guardados" },
  { key: "recent", label: "Más recientes" },
];
const PERIODS = [
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 0, label: "Todo" },
];

const chip = (on: boolean) => (on ? "btn-primary btn-sm" : "btn-ghost btn-sm");

function Bars({ ins }: { ins: RadarInsights }) {
  const wTotal = Math.max(1, ins.durations.reduce((a, d) => a + d.winners, 0));
  const oTotal = Math.max(1, ins.durations.reduce((a, d) => a + d.others, 0));
  return (
    <div>
      <p className="mb-3 text-sm text-muted">Duración: qué parte de cada grupo cae en cada tramo</p>
      <ul className="grid gap-3">
        {ins.durations.map((d) => {
          const w = d.winners / wTotal;
          const o = d.others / oTotal;
          return (
            <li key={d.label} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm">
              <span className="text-muted">{d.label}</span>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(w * 100, w ? 2 : 0)}%` }} />
                  <span className="font-mono text-xs text-accent tabular-nums">{Math.round(w * 100)} %</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-line-strong" style={{ width: `${Math.max(o * 100, o ? 2 : 0)}%` }} />
                  <span className="font-mono text-xs text-muted tabular-nums">{Math.round(o * 100)} %</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-4 rounded-full bg-accent" /> Los que revientan
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-4 rounded-full bg-line-strong" /> El resto
        </span>
      </p>
    </div>
  );
}

function Compare({ rows }: { rows: { label: string; w: string; o: string }[] }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Medianas de los vídeos que revientan frente al resto</caption>
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="pb-2 font-normal" />
          <th className="pb-2 text-right font-normal">Revientan</th>
          <th className="pb-2 text-right font-normal">Resto</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-line">
            <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">
              {r.label}
            </th>
            <td className="py-2 text-right font-mono text-accent tabular-nums">{r.w}</td>
            <td className="py-2 text-right font-mono tabular-nums">{r.o}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function RadarPage({ searchParams }: PageProps<"/manny/radar">) {
  const s = await requireSession();
  const sp = await searchParams;
  const tz = workspaceTz(s.workspaceId);
  const orden = SORTS.find((o) => o.key === sp.orden)?.key ?? "ratio";
  const dias = PERIODS.find((p) => String(p.days) === sp.dias)?.days ?? 90;
  const tracked = listTracked(s.workspaceId);
  const cuenta = typeof sp.cuenta === "string" && tracked.some((t) => t.handle === sp.cuenta) ? sp.cuenta : null;

  const all = radarFeed(s.workspaceId, { days: dias || undefined, limit: 5000 });
  const feed = (cuenta ? all.filter((v) => v.handle === cuenta) : all).sort((a, b) => {
    const k = { ratio: (v: typeof a) => v.vsMedian ?? -1, views: (v: typeof a) => v.views ?? -1, saves: (v: typeof a) => v.saveRate ?? -1, recent: (v: typeof a) => v.postedAt ?? 0 }[orden];
    return k(b) - k(a);
  });
  const shown = feed.slice(0, 40);
  const ins = computeInsights(all, tz);
  const analysis = getRadarAnalysis(s.workspaceId);
  const readAccounts = tracked.filter((t) => t.syncedAt).length;
  const lastRead = Math.max(0, ...tracked.map((t) => t.syncedAt ?? 0));
  const query = { orden, dias: String(dias) };
  const link = (over: Record<string, string>) => `/manny/radar?${new URLSearchParams({ ...query, ...(cuenta ? { cuenta } : {}), ...over })}`;
  const disabledReason = all.length < 12 || ins.accounts < 2 ? "Lee al menos dos cuentas del radar para que Manny tenga datos con los que trabajar." : null;

  return (
    <>
      <PageHeader title="Radar" sub="Sigo a los mejores creadores de fitness y te enseño qué vídeos les están reventando para su tamaño, qué tienen en común y qué puedes copiar." />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="order-2 min-w-0 space-y-12 lg:order-1">
          {tracked.length === 0 ? (
            <section className="card p-6 md:p-8">
              <h2 className="display text-3xl text-balance">Empieza eligiendo a quién seguir</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-pretty text-muted">
                Para cada cuenta leo sus últimos vídeos con sus visitas, guardados y compartidos, y los comparo con lo normal para esa cuenta. Un vídeo con 80.000 visitas en una cuenta que suele hacer 9.000 dice más que uno con 500.000 en una de millones. Eso es lo que merece la pena copiar.
              </p>
            </section>
          ) : (
            <>
              <section aria-labelledby="reventando">
                <h2 id="reventando" className="display mb-1 text-3xl">
                  Lo que está reventando
                </h2>
                <p className="mb-4 text-sm text-muted tabular-nums">
                  {feed.length} vídeos de {new Set(feed.map((v) => v.handle)).size} cuentas{lastRead ? ` · última lectura ${since(lastRead)}` : ""}
                  {cuenta && (
                    <>
                      {" · "}
                      <Link href={link({ cuenta: "" })} className="underline underline-offset-4 hover:text-accent">
                        ver todas
                      </Link>
                    </>
                  )}
                </p>
                <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
                  <nav aria-label="Ordenar" className="flex flex-wrap gap-1.5">
                    {SORTS.map((o) => (
                      <Link key={o.key} href={link({ orden: o.key })} aria-current={o.key === orden ? "true" : undefined} className={chip(o.key === orden)}>
                        {o.label}
                      </Link>
                    ))}
                  </nav>
                  <nav aria-label="Periodo" className="flex flex-wrap gap-1.5">
                    {PERIODS.map((p) => (
                      <Link key={p.days} href={link({ dias: String(p.days) })} aria-current={p.days === dias ? "true" : undefined} className={chip(p.days === dias)}>
                        {p.label}
                      </Link>
                    ))}
                  </nav>
                </div>
                {shown.length === 0 ? (
                  <p className="card p-5 text-sm text-muted">{readAccounts ? "No hay vídeos en este periodo. Prueba con «Todo» o actualiza las cuentas." : "Todavía no he leído ninguna cuenta. Pulsa «Actualizar todas» en la columna de cuentas."}</p>
                ) : (
                  <ul className="card divide-y divide-line">
                    {shown.map((v) => (
                      <VideoRow
                        key={`${v.platform}-${v.id}`}
                        v={v}
                        actions={
                          <>
                            <Link href={analyzeHref(v.url)} className="btn-primary btn-sm">
                              Copiar este
                            </Link>
                            <SaveIdeaButton titulo={v.caption.replace(/#[\p{L}\p{N}_]+/gu, "").trim().slice(0, 100) || `Vídeo de @${v.handle}`} basadoEn={`@${v.handle} · ${compact(v.views)} visitas`} />
                          </>
                        }
                      />
                    ))}
                  </ul>
                )}
                {feed.length > shown.length && <p className="mt-3 text-sm text-muted">Mostrando {shown.length} de {feed.length}. Filtra por cuenta o periodo para ver el resto.</p>}
              </section>

              <section aria-labelledby="comun">
                <h2 id="comun" className="display mb-1 text-3xl">
                  Qué tienen en común
                </h2>
                <p className="mb-5 max-w-2xl text-sm text-pretty text-muted">
                  Cuento como «reventón» el vídeo que dobla las visitas habituales de su cuenta y pasa de 5.000. Ahora mismo hay <span className="font-medium text-fg tabular-nums">{ins.winners}</span> entre {ins.videos}.
                </p>
                {ins.winners < 3 ? (
                  <p className="card p-5 text-sm text-pretty text-muted">Con tan pocos reventones no saco conclusiones fiables. Amplía el periodo o sigue a más cuentas.</p>
                ) : (
                  <div className="card grid gap-8 p-5 md:grid-cols-2 md:p-6">
                    <Bars ins={ins} />
                    <div className="grid content-start gap-6">
                      <Compare
                        rows={[
                          { label: "Duración", w: duration(ins.medianDuration.winners), o: duration(ins.medianDuration.others) },
                          { label: "Guardados", w: pct(ins.saveRate.winners), o: pct(ins.saveRate.others) },
                          { label: "Compartidos", w: pct(ins.shareRate.winners), o: pct(ins.shareRate.others) },
                          { label: "Descripción", w: ins.captionLength.winners === null ? "—" : `${Math.round(ins.captionLength.winners)} car.`, o: ins.captionLength.others === null ? "—" : `${Math.round(ins.captionLength.others)} car.` },
                        ]}
                      />
                      {ins.topTags.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm text-muted">Hashtags que se repiten en los que revientan</p>
                          <p className="flex flex-wrap gap-1.5">
                            {ins.topTags.map((t) => (
                              <span key={t.tag} className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-accent">
                                {t.tag} <span className="font-mono text-muted tabular-nums">{t.count}</span>
                              </span>
                            ))}
                          </p>
                        </div>
                      )}
                      {ins.bestDays.length > 0 && (
                        <p className="text-sm text-pretty text-muted">
                          Se publicaron sobre todo en {ins.bestDays.map((d) => d.day).join(", ")}, hacia las {ins.bestHours.map((h) => `${h.hour}:00`).join(", ")} (hora de España). Con pocos vídeos, tómalo como pista, no como regla.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section aria-labelledby="manny">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="manny" className="display text-3xl">
                      Lo que dice Manny
                    </h2>
                    {analysis && <p className="mt-1 text-sm text-muted">Analizado {since(analysis.updatedAt)}</p>}
                  </div>
                  <AnalyzeRadarButton hasAnalysis={!!analysis} disabledReason={disabledReason} />
                </div>
                {analysis ? (
                  <div className="card grid gap-8 p-5 md:p-6">
                    <p className="max-w-3xl text-[15px] leading-relaxed text-pretty">{analysis.data.resumen}</p>
                    <div>
                      <h3 className="mb-3 text-sm font-medium">Lo que se repite</h3>
                      <ul className="divide-y divide-line">
                        {analysis.data.patrones.map((p, i) => (
                          <li key={i} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                            <p className="font-medium text-balance">{p.patron}</p>
                            <p className="text-sm text-pretty text-muted">{p.evidencia}</p>
                            <p className="text-sm text-pretty">
                              <span className="text-accent">Para ti:</span> {p.comoAplicarlo}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {analysis.data.probar.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-sm font-medium">Para probar esta semana</h3>
                        <ul className="grid gap-3">
                          {analysis.data.probar.map((p, i) => (
                            <li key={i} className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 basis-64">
                                <p className="text-sm font-medium text-balance">{p.titulo}</p>
                                <p className="text-sm text-pretty text-muted">{p.porque}</p>
                              </div>
                              <SaveIdeaButton titulo={p.titulo} angulo={p.porque} basadoEn="Análisis del radar" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="grid gap-6 md:grid-cols-2">
                      {analysis.data.evitar.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-sm font-medium">Lo que flojea</h3>
                          <ul className="grid list-disc gap-1.5 pl-5 text-sm marker:text-bad">
                            {analysis.data.evitar.map((e, i) => (
                              <li key={i} className="pl-1 text-pretty">
                                {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.data.horarios && (
                        <div>
                          <h3 className="mb-2 text-sm font-medium">Días y horas</h3>
                          <p className="text-sm text-pretty text-muted">{analysis.data.horarios}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="card p-5 text-sm text-pretty text-muted">Cuando tengas varias cuentas leídas, Manny interpreta estos datos: qué patrones se repiten, qué flojea y qué probar tú esta semana.</p>
                )}
              </section>
            </>
          )}
        </div>

        <aside className="order-1 min-w-0 lg:order-2">
          <div className="lg:sticky lg:top-6">
            <AccountsPanel accounts={tracked} activeHandle={cuenta} query={query} />
          </div>
        </aside>
      </div>
    </>
  );
}
