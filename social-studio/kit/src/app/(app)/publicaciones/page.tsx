import type { Metadata } from "next";
import Link from "next/link";
import { ListVideo, Plus } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PostCard } from "@/components/post-card";
import { EmptyState, PageHeader } from "@/components/ui";
import type { PostStatus } from "@/lib/db";
import { listPosts } from "@/lib/posts";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Publicaciones" };

const FILTERS: { key: string; label: string; statuses?: PostStatus[] }[] = [
  { key: "all", label: "Todas" },
  { key: "scheduled", label: "Programadas", statuses: ["scheduled", "publishing"] },
  { key: "done", label: "Publicadas", statuses: ["done", "partial"] },
  { key: "attention", label: "Necesitan atención", statuses: ["failed", "partial"] },
];

const PAGE = 30;

export default async function PublicacionesPage({ searchParams }: PageProps<"/publicaciones">) {
  const s = await requireSession();
  const sp = await searchParams;
  const filter = FILTERS.find((x) => x.key === sp.f) ?? FILTERS[0];
  const limit = Math.min(Math.max(PAGE, Number(sp.n) || PAGE), 600);
  const posts = listPosts(s.workspaceId, { statuses: filter.statuses, limit: limit + 1 });
  const more = posts.length > limit;
  const shown = posts.slice(0, limit);
  if (filter.key === "scheduled") shown.reverse();

  return (
    <>
      <AutoRefresh active={shown.some((p) => p.status === "publishing")} />
      <PageHeader title="Publicaciones">
        <Link href="/nuevo" className="btn-primary">
          <Plus size={16} aria-hidden /> Nueva
        </Link>
      </PageHeader>
      <nav aria-label="Filtrar" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`?f=${x.key}`}
            aria-current={filter.key === x.key ? "page" : undefined}
            className={filter.key === x.key ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-3">
        {shown.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {!shown.length && (
          <EmptyState icon={<ListVideo size={18} aria-hidden />} title="No hay publicaciones aquí" action={{ href: "/nuevo", label: "Crear una" }} />
        )}
        {more && (
          <div className="text-center">
            <Link href={`?f=${filter.key}&n=${limit + PAGE}`} scroll={false} className="btn-ghost">
              Ver más
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
