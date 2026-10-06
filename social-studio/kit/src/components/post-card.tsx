import { ExternalLink } from "lucide-react";
import type { Stats } from "@/lib/db";
import type { PostRow } from "@/lib/posts";
import { PostActions, TargetReview } from "./post-actions";
import { fmtDate, fmtNum, PlatformDot, StatusPill } from "./ui";

export function PostCard({ post }: { post: PostRow }) {
  const tags = JSON.parse(post.hashtags) as string[];
  return (
    <article className="card flex flex-col gap-4 p-4 sm:flex-row">
      {/* preload="none": una lista larga no descarga todos los vídeos */}
      <video
        src={`/api/media/${post.media_id}/file`}
        preload="none"
        controls
        muted
        className="aspect-[9/16] w-full max-w-28 shrink-0 self-start rounded-lg bg-black object-cover"
        aria-label={`Vídeo: ${post.original_name}`}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={post.status} />
          <span className="text-sm text-muted tabular-nums">
            {post.status === "scheduled" ? "Programada para " : ""}
            {fmtDate(post.scheduled_at)}
          </span>
        </div>
        {post.title && <h3 className="font-medium text-balance">{post.title}</h3>}
        <p className="line-clamp-3 text-sm text-pretty">{post.description}</p>
        {tags.length > 0 && <p className="text-sm break-words text-accent">{tags.map((t) => `#${t}`).join(" ")}</p>}

        <ul className="space-y-2">
          {post.targets.map((t) => {
            const s: Stats = t.stats ? JSON.parse(t.stats) : {};
            return (
              <li key={t.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <PlatformDot platform={t.platform} size={20} />
                  <span className="text-muted">{t.account_name}</span>
                  <StatusPill status={t.status} />
                  {t.remote_url && (
                    <a
                      href={t.remote_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      Ver <ExternalLink size={12} aria-hidden />
                      <span className="sr-only">en {t.platform}</span>
                    </a>
                  )}
                  {t.stats && (
                    // Solo los datos que la red dio: nunca se muestra 0 por falta de dato
                    <span className="text-xs text-muted tabular-nums">
                      {[
                        s.views !== undefined && `${fmtNum(s.views)} vistas`,
                        s.likes !== undefined && `${fmtNum(s.likes)} me gusta`,
                        s.comments !== undefined && `${fmtNum(s.comments)} coment.`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Métricas no disponibles"}
                    </span>
                  )}
                </div>
                {t.error && <p className={`mt-1 text-xs ${t.status === "needs_review" ? "text-warn" : "text-bad"}`}>{t.error}</p>}
                {t.status === "needs_review" && <TargetReview targetId={t.id} />}
              </li>
            );
          })}
        </ul>
        <PostActions id={post.id} status={post.status} hasFailed={post.targets.some((t) => t.status === "failed")} />
      </div>
    </article>
  );
}
