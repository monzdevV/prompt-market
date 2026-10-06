import type { Metadata } from "next";
import Link from "next/link";
import { Circle, CircleCheck, CircleDot, Radar } from "lucide-react";
import { QuickPaste } from "@/components/manny/quick-paste";
import { ScriptCard, type ScriptItem } from "@/components/manny/script-card";
import { SeeAll, VideoRow } from "@/components/manny/video-row";
import { PageHeader } from "@/components/ui";
import { workspaceTz } from "@/lib/analytics";
import { DAY_LONG, since, todayKey, WEEK } from "@/lib/manny/format";
import { getProfile, profileSchedule } from "@/lib/manny/profile";
import { isOutlier, listTracked, radarFeed } from "@/lib/manny/radar";
import { listRemixes } from "@/lib/manny/remix";
import { listScripts } from "@/lib/manny/scripts";
import type { ScriptStatus } from "@/lib/manny/types";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Hoy" };

const STATUS_ICON: Record<ScriptStatus, { icon: typeof Circle; cls: string; label: string }> = {
  pendiente: { icon: Circle, cls: "text-faint", label: "Pendiente" },
  grabado: { icon: CircleDot, cls: "text-accent", label: "Grabado" },
  publicado: { icon: CircleCheck, cls: "text-ok", label: "Publicado" },
  descartado: { icon: Circle, cls: "text-faint opacity-40", label: "Descartado" },
};

const COUNT = ["Ninguna", "Una", "Dos", "Tres", "Cuatro", "Cinco"];
const DAY_PLURAL: Record<string, string> = { Lun: "lunes", Mar: "martes", Mié: "miércoles", Jue: "jueves", Vie: "viernes", Sáb: "sábados", Dom: "domingos" };
const listEs = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : (xs[0] ?? ""));

export default async function MannyHoy() {
  const s = await requireSession();
  const tz = workspaceTz(s.workspaceId);
  const now = Date.now();
  const rows = listScripts(s.workspaceId);
  const plan = rows.filter((r) => r.source === "plan" && r.status !== "descartado");
  const today = todayKey(tz, now);
  const toItem = (r: (typeof rows)[number]): ScriptItem => ({ id: r.id, source: r.source, status: r.status, script: r.script });
  const todays = plan.filter((r) => r.script.dia === today).sort((a, b) => (a.script.hora ?? "").localeCompare(b.script.hora ?? ""));
  const nextUp = todays.length ? null : plan.find((r) => r.status === "pendiente");
  const done = plan.filter((r) => r.status === "publicado").length;
  const recorded = plan.filter((r) => r.status === "grabado").length;

  const tracked = listTracked(s.workspaceId);
  const hot = radarFeed(s.workspaceId, { days: 45, sort: "ratio", limit: 400 }).filter(isOutlier).slice(0, 4);
  const remixes = listRemixes(s.workspaceId, 4);

  // Horarios de «Mi perfil» (ritmo y directos); lo que no diga, del plan de partida
  const schedule = profileSchedule(getProfile(s.workspaceId));
  const live = schedule.live;
  const postsText = `${COUNT[schedule.posts.length] ?? schedule.posts.length} ${schedule.posts.length === 1 ? "publicación" : "publicaciones"} al día, ${schedule.posts.length === 1 ? "a la" : "a las"} ${listEs(schedule.posts)}.`;
  const liveText = live ? ` Directo los ${listEs(live.days.map((d) => DAY_PLURAL[d]))} a las ${live.time}.` : "";

  const dateText = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);

  return (
    <>
      <PageHeader title="Hoy" sub={`${dateText.charAt(0).toUpperCase()}${dateText.slice(1)}. Esto es lo que toca grabar y publicar.`} />

      <section aria-labelledby="pega" className="card rise mb-10 p-5 md:p-7" style={{ ["--d" as string]: "60ms" }}>
        <h2 id="pega" className="display text-3xl text-balance md:text-4xl">
          Pásame un TikTok y te doy tus versiones
        </h2>
        <p className="mt-2 mb-5 max-w-xl text-sm text-pretty text-muted">Lo leo, oigo lo que dice y te escribo tres guiones para que grabes el tuyo: gancho, planos, edición y descripción listos para copiar.</p>
        <QuickPaste />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="toca">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 id="toca" className="display text-3xl">
                {todays.length ? `Toca hoy · ${DAY_LONG[today]}` : "Hoy no hay nada planificado"}
              </h2>
              <SeeAll href="/manny/guiones">Todos los guiones</SeeAll>
            </div>
            {todays.length > 0 ? (
              <div className="space-y-3">
                {todays.map((r, i) => (
                  <ScriptCard key={r.id} item={toItem(r)} defaultOpen={i === 0 && r.status !== "publicado"} />
                ))}
              </div>
            ) : nextUp ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">Aprovecha para adelantar el siguiente guion que te falta por grabar:</p>
                <ScriptCard item={toItem(nextUp)} />
              </div>
            ) : (
              <p className="card p-5 text-sm text-muted">Has hecho todo lo planificado. Pídele a Manny ideas nuevas en la sección Ideas.</p>
            )}
          </section>

          <section aria-labelledby="semana">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="semana" className="display text-3xl">
                La semana
              </h2>
              <p className="font-mono text-xs text-muted tabular-nums">
                {done} publicados · {recorded} grabados · {plan.length} planificados
              </p>
            </div>
            <ol className="grid grid-cols-7 gap-1.5 overflow-x-auto" aria-label="Guiones por día">
              {WEEK.map((d) => {
                const slots = plan.filter((r) => r.script.dia === d).sort((a, b) => (a.script.hora ?? "").localeCompare(b.script.hora ?? ""));
                const isToday = d === today;
                return (
                  <li key={d} className={`min-w-[3.2rem] rounded-xl border p-2 ${isToday ? "border-accent/50 bg-accent-soft" : "border-line bg-surface"}`}>
                    <p className={`text-center text-xs font-medium ${isToday ? "text-accent" : "text-muted"}`}>{d}</p>
                    <ul className="mt-2 grid gap-1.5">
                      {slots.map((r) => {
                        const st = STATUS_ICON[r.status];
                        return (
                          <li key={r.id}>
                            <Link href={`/manny/guiones#${r.id}`} title={`${r.script.hora} · ${r.script.titulo} (${st.label})`} className="flex flex-col items-center gap-0.5 rounded-md py-1 transition-colors hover:bg-surface-3">
                              <st.icon size={15} aria-hidden className={st.cls} />
                              <span className="font-mono text-[10px] text-muted tabular-nums">{r.script.hora}</span>
                              <span className="sr-only">
                                {r.script.titulo}: {st.label}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                      {live?.days.includes(d) && <li className="rounded-md border border-dashed border-line-strong py-1 text-center font-mono text-[10px] text-muted">{live.time} directo</li>}
                    </ul>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs text-muted">
              {postsText}
              {liveText} Lo cambias en <Link href="/manny/perfil" className="underline underline-offset-2 hover:text-fg">Mi perfil</Link>.
            </p>
          </section>
        </div>

        <aside className="min-w-0 space-y-10">
          <section aria-labelledby="funciona">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 id="funciona" className="display text-3xl">
                Funciona ahora
              </h2>
              <SeeAll href="/manny/radar">Radar</SeeAll>
            </div>
            {hot.length > 0 ? (
              <ul className="card divide-y divide-line">
                {hot.map((v) => (
                  <VideoRow key={`${v.platform}-${v.id}`} v={v} dense />
                ))}
              </ul>
            ) : (
              <div className="card flex flex-col items-start gap-3 p-5">
                <Radar size={18} aria-hidden className="text-accent" />
                <p className="text-sm text-pretty text-muted">{tracked.length ? "Todavía no hay ningún vídeo que reviente para el tamaño de su cuenta. Actualiza el radar en unos días." : "Sigue a los mejores creadores de fitness y te enseño qué vídeos les están explotando, para que copies lo que funciona."}</p>
                <Link href="/manny/radar" className="btn-ghost btn-sm">
                  {tracked.length ? "Abrir el radar" : "Montar mi radar"}
                </Link>
              </div>
            )}
          </section>

          {remixes.length > 0 && (
            <section aria-labelledby="analizados">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 id="analizados" className="display text-3xl">
                  Lo último que me pasaste
                </h2>
                <SeeAll href="/manny/copiar">Ver todo</SeeAll>
              </div>
              <ul className="card divide-y divide-line">
                {remixes.map((r) => (
                  <li key={r.id}>
                    <Link href={`/manny/copiar/${r.id}`} className="block px-4 py-3 transition-colors hover:bg-surface-2/60">
                      <p className="line-clamp-2 text-sm text-pretty">{r.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {r.video ? `@${r.video.handle} · ` : ""}
                        {since(r.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
