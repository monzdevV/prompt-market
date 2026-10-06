import type { Metadata } from "next";
import { CircleAlert, CircleCheck } from "lucide-react";
import { DisconnectButton, SyncAccountButton } from "@/components/account-actions";
import { ConnectionPill, connectionHelp } from "@/components/connection-status";
import { PageHeader, PlatformDot } from "@/components/ui";
import { pendingCountByAccount } from "@/lib/accounts";
import { accountsOverview } from "@/lib/analytics";
import { publishingEnabled, tiktokAudited } from "@/lib/features";
import { connectorStatus } from "@/lib/platforms";
import { isRelayed, relayPlatforms, uploadPostEnabled } from "@/lib/platforms/uploadpost";
import { youtubeCanUpload } from "@/lib/platforms/youtube";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Cuentas" };

const HELP: Record<string, { text: string; before?: string[] }> = {
  meta: {
    text: "Tus Páginas de Facebook y las cuentas de Instagram profesionales vinculadas a ellas.",
    before: [
      "Tu Instagram debe ser una cuenta profesional (Empresa o Creador). Se cambia gratis en Instagram → Configuración → Tipo de cuenta.",
      "Esa cuenta de Instagram tiene que estar vinculada a una Página de Facebook que administres.",
      "Al conectar, Facebook te pedirá elegir las Páginas y cuentas de Instagram: marca las que quieras usar aquí.",
    ],
  },
  youtube: {
    text: "Tu canal: suscriptores, vídeos y sus métricas. Para publicar te pediremos un permiso adicional la primera vez.",
  },
  tiktok: {
    text: "Tu perfil: seguidores y métricas de tus vídeos públicos. En cada publicación eliges quién lo ve y si es promocional.",
  },
  // Mientras TikTok no haya auditado la app, sus reglas limitan lo que se puede hacer
  tiktok_unaudited: {
    text: "Tu perfil: seguidores y métricas de tus vídeos públicos.",
    before: [
      "Mientras TikTok revisa esta app, lo que publiques desde aquí se sube como «Solo yo» (privado); luego puedes hacerlo público desde TikTok.",
      "TikTok solo permite conectar cuentas privadas durante esa revisión.",
      "Las métricas solo incluyen tus vídeos públicos: los privados no aparecen en la analítica.",
    ],
  },
  linkedin: { text: "Publica en tu perfil personal de LinkedIn." },
  tiktok_soon: { text: "Publica y programa tus vídeos en TikTok desde Manny." },
};

const CONNECTOR_OF = { instagram: "meta", facebook: "meta", youtube: "youtube", tiktok: "tiktok", linkedin: "linkedin", x: "x" } as const;

export default async function CuentasPage({ searchParams }: PageProps<"/cuentas">) {
  const s = await requireSession();
  const sp = await searchParams;
  const accounts = accountsOverview(s.workspaceId);
  const pending = pendingCountByAccount(s.workspaceId);
  const relay = uploadPostEnabled();
  // Con el servicio de publicación activo, la conexión directa de cada red solo se ofrece si se pide (DIRECT_CONNECT=true);
  // las cuentas que ya estaban conectadas así se siguen mostrando para poder gestionarlas
  const direct = !relay || process.env.DIRECT_CONNECT === "true";
  const relayed = relay ? relayPlatforms() : [];
  // Redes que no van por Upload-Post (p. ej. TikTok, con nuestra propia app) se siguen mostrando con su tarjeta
  const connectors = connectorStatus().filter(
    (c) => direct || c.platforms.some((p) => !relayed.includes(p as never)) || accounts.some((a) => c.platforms.includes(a.platform) && !isRelayed(a)),
  );
  const relayedAccounts = accounts.filter((a) => isRelayed(a));
  const label = sp.red === "uploadpost" ? "tus redes" : (connectorStatus().find((c) => c.id === sp.red)?.label ?? "la red");
  const n = Math.max(1, Number(sp.n) || 1);
  const outside = Number(sp.fuera) || 0;
  const ok =
    sp.ok === "connected"
      ? `${n} ${n === 1 ? "cuenta conectada" : "cuentas conectadas"} de ${label}. Estamos trayendo sus datos.` +
        (outside ? ` ${outside} no se conectaron porque has llegado al máximo de cuentas conectadas.` : "") +
        (sp.sin_ig ? " No vimos ningún Instagram profesional vinculado a tus Páginas: revisa «Antes de conectar» y vuelve a conectar." : "")
      : null;
  const ERRORS: Record<string, string> = {
    denied: `No se completó la conexión con ${label}.`,
    expired: "La conexión caducó o no es válida. Vuelve a intentarlo.",
    no_accounts:
      sp.red === "meta"
        ? "No encontramos Páginas de Facebook. Instagram debe ser profesional y estar vinculado a una Página."
        : `No se encontraron cuentas de ${label}.`,
    failed: `${label} no aceptó la conexión. Vuelve a intentarlo en unos minutos.`,
    unavailable: `La conexión con ${label} aún no está disponible.`,
    unknown: "Red desconocida.",
    plan_limit: "Has llegado al máximo de cuentas conectadas. Desconecta alguna para añadir otra.",
    relay_full: "Ahora mismo no podemos conectar más cuentas. Avísanos en Contacto y lo resolvemos.",
  };
  const err = typeof sp.error === "string" ? (ERRORS[sp.error] ?? null) : null;

  return (
    <>
      <PageHeader title="Cuentas" sub="Conecta tus redes para publicar y ver su analítica. Puedes desconectarlas cuando quieras." />
      {ok && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-ok-soft p-3 text-sm text-ok">
          <CircleCheck size={16} aria-hidden /> {ok}
        </p>
      )}
      {err && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg bg-bad-soft p-3 text-sm text-bad">
          <CircleAlert size={16} aria-hidden /> {err}
        </p>
      )}

      {relay && <RelayCard accounts={relayedAccounts} pending={pending} platforms={relayed} />}

      <div className="grid gap-4 lg:grid-cols-2">
        {connectors.map((c) => {
          const mine = accounts.filter((a) => c.platforms.includes(a.platform) && !isRelayed(a));
          // Con Upload-Post, TikTok se activa cuando TikTok apruebe nuestra app: hasta entonces, «Próximamente»
          const soon = relay && c.id === "tiktok" && !tiktokAudited() && !relayed.includes("tiktok");
          const help = soon ? HELP.tiktok_soon : c.id === "tiktok" && !tiktokAudited() ? HELP.tiktok_unaudited : HELP[c.id];
          const canConnect = c.configured && (direct || !c.platforms.every((p) => relayed.includes(p as never))) && !soon;
          return (
            <section key={c.id} className="card flex flex-col p-5" aria-labelledby={`c-${c.id}`}>
              <div className="mb-2 flex items-center gap-2">
                {c.platforms.map((p) => (
                  <PlatformDot key={p} platform={p} size={26} />
                ))}
                <h2 id={`c-${c.id}`} className="ml-1 font-semibold">
                  {c.label}
                </h2>
              </div>
              <p className="mb-3 text-sm text-muted">{help?.text}</p>

              {help?.before && (
                <details className="mb-4 rounded-lg border border-line p-3 text-sm" open={!mine.length}>
                  <summary className="cursor-pointer font-medium">Antes de conectar</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                    {help.before.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </details>
              )}

              {mine.length > 0 && (
                <ul className="mb-4 space-y-2">
                  {mine.map((a) => {
                    const reconnect = `/api/oauth/${CONNECTOR_OF[a.platform]}/start`;
                    const needsUploadPermission = a.platform === "youtube" && publishingEnabled("youtube") && !youtubeCanUpload(a.granted_scopes);
                    return (
                      <li key={a.id} className="rounded-lg bg-surface-2 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {a.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.avatar} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <PlatformDot platform={a.platform} size={32} />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                          <ConnectionPill state={a.state} />
                        </div>
                        <p className="mt-2 text-xs text-muted">{connectionHelp(a.state, a.platform, a.last_synced_at, a.rate_limited_until)}</p>
                        {a.last_sync_error && a.state === "SYNCED" && <p className="mt-1 text-xs text-warn">{a.last_sync_error}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(a.state === "NEEDS_REAUTHORIZATION" || a.state === "ERROR") && (
                            // Enlace normal (no <Link>): va a la red social y vuelve con una redirección
                            <a href={reconnect} className="btn-primary btn-sm">
                              Reconectar
                            </a>
                          )}
                          {needsUploadPermission && (
                            <a href={`${reconnect}?permiso=publicar`} className="btn-ghost btn-sm">
                              Autorizar publicación en YouTube
                            </a>
                          )}
                          {a.state !== "NEEDS_REAUTHORIZATION" && <SyncAccountButton id={a.id} />}
                          <DisconnectButton id={a.id} name={a.name} scheduled={pending.get(a.id) ?? 0} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-auto">
                {soon ? (
                  <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">
                    Próximamente: estamos terminando la aprobación con TikTok.
                  </p>
                ) : !canConnect && c.configured ? (
                  <p className="text-xs text-muted">Conexión directa (sin el servicio de publicación). Para nuevas redes usa «Conectar mis redes».</p>
                ) : c.configured ? (
                  <a href={`/api/oauth/${c.id}/start`} className={mine.length ? "btn-ghost" : "btn-primary"}>
                    {mine.length ? "Conectar otra cuenta" : `Conectar ${c.label}`}
                  </a>
                ) : (
                  <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">Próximamente disponible.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

type OverviewAccount = ReturnType<typeof accountsOverview>[number];

/** Redes conectadas a través del servicio de publicación (Upload-Post): una sola conexión para las cuatro. */
const RELAY_LABEL = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", x: "X" } as const;

function RelayCard({
  accounts,
  pending,
  platforms,
}: {
  accounts: OverviewAccount[];
  pending: Map<number, number>;
  platforms: (keyof typeof RELAY_LABEL)[];
}) {
  const names = platforms.map((p) => RELAY_LABEL[p]);
  const title = names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : (names[0] ?? "");
  return (
    <section className="card mb-6 p-5" aria-labelledby="c-relay">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {platforms.map((p) => (
          <PlatformDot key={p} platform={p} size={26} />
        ))}
        <h2 id="c-relay" className="ml-1 font-semibold">
          {title}
        </h2>
      </div>
      <p className="mb-3 text-sm text-muted">
        Conecta tus redes en una página segura de nuestro servicio de publicación y vuelve aquí. Solo usamos el permiso para publicar lo
        que programes.
      </p>
      <details className="mb-4 rounded-lg border border-line p-3 text-sm" open={!accounts.length}>
        <summary className="cursor-pointer font-medium">Antes de conectar</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>Instagram tiene que ser una cuenta profesional (Creador o Empresa). Se cambia gratis en Instagram → Configuración → Tipo de cuenta.</li>
          <li>En Facebook se publica en tus Páginas, no en tu perfil personal.</li>
          <li>Al terminar, pulsa «Volver a Manny» para ver aquí tus cuentas.</li>
          {platforms.includes("x") && <li>En X, los vídeos pueden durar hasta 2 minutos y 20 segundos y el texto hasta 280 caracteres.</li>}
        </ul>
      </details>

      {accounts.length > 0 && (
        <ul className="mb-4 grid gap-2 sm:grid-cols-2">
          {accounts.map((a) => (
            <li key={a.id} className="rounded-lg bg-surface-2 p-3 text-sm">
              <div className="flex items-center gap-2.5">
                {a.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatar} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <PlatformDot platform={a.platform} size={32} />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                <PlatformDot platform={a.platform} size={18} />
              </div>
              {a.state === "NEEDS_REAUTHORIZATION" && <p className="mt-2 text-xs text-warn">El permiso caducó: vuelve a conectarla.</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <DisconnectButton id={a.id} name={a.name} scheduled={pending.get(a.id) ?? 0} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Enlaces normales (no <Link>): salen de la app y vuelven con una redirección */}
        <a href="/api/uploadpost/connect" className="btn-primary">
          {accounts.length ? "Añadir o quitar redes" : "Conectar mis redes"}
        </a>
        {accounts.length > 0 && (
          <a href="/api/uploadpost/return" className="btn-ghost">
            Actualizar lista
          </a>
        )}
      </div>
    </section>
  );
}
