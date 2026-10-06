import type { Metadata } from "next";
import Link from "next/link";
import { CopiarForm } from "@/components/manny/copiar-form";
import { Thumb } from "@/components/manny/thumb";
import { PageHeader } from "@/components/ui";
import { compact, since } from "@/lib/manny/format";
import { listRemixes } from "@/lib/manny/remix";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Copiar un vídeo" };

export default async function CopiarPage({ searchParams }: PageProps<"/manny/copiar">) {
  const s = await requireSession();
  const sp = await searchParams;
  const url = typeof sp.url === "string" ? sp.url : "";
  const remixes = listRemixes(s.workspaceId, 30);

  return (
    <>
      <PageHeader title="Copiar un vídeo" sub="Pega un TikTok o un Short que te guste. Te digo por qué funciona y te escribo tres versiones para que grabes la tuya, no una copia." />

      <section className="card mb-12 p-5 md:p-7">
        <CopiarForm initialUrl={url} autoStart={sp.go === "1"} />
      </section>

      <section aria-labelledby="historial">
        <h2 id="historial" className="display mb-4 text-3xl">
          Lo que ya has analizado
        </h2>
        {remixes.length === 0 ? (
          <p className="card p-5 text-sm text-muted">Aquí aparecerán los vídeos que me pases, con sus tres versiones guardadas.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {remixes.map((r) => (
              <li key={r.id}>
                <Link href={`/manny/copiar/${r.id}`} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2/60">
                  <Thumb src={r.video?.thumb ?? null} className="h-14 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{r.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {r.video ? `@${r.video.handle} · ${compact(r.video.views)} visitas · ` : "Texto pegado a mano · "}
                      {r.result.versiones.length} versiones · {since(r.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
