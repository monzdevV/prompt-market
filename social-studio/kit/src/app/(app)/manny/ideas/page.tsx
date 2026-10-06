import type { Metadata } from "next";
import { IdeasBoard, IdeasGenerator } from "@/components/manny/ideas-board";
import { YtSearch } from "@/components/manny/yt-search";
import { PageHeader } from "@/components/ui";
import { listIdeas } from "@/lib/manny/ideas";
import { isOutlier, radarFeed } from "@/lib/manny/radar";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Ideas" };

export default async function IdeasPage() {
  const s = await requireSession();
  const ideas = listIdeas(s.workspaceId);
  const hasRadar = radarFeed(s.workspaceId, { days: 60, limit: 5000 }).some(isOutlier);

  return (
    <>
      <PageHeader title="Ideas" sub="Pídeselas a Manny, guarda las que veas en el radar o en la búsqueda y convierte las buenas en guion listo para grabar." />

      <section className="card mb-12 p-5 md:p-7">
        <IdeasGenerator hasRadar={hasRadar} />
      </section>

      <section aria-labelledby="banco" className="mb-14">
        <h2 id="banco" className="display mb-4 text-3xl">
          Tu banco de ideas
        </h2>
        <IdeasBoard ideas={ideas} />
      </section>

      <section aria-labelledby="buscar">
        <h2 id="buscar" className="display mb-4 text-3xl">
          Buscar ideas en YouTube
        </h2>
        <div className="card p-5 md:p-7">
          <YtSearch />
        </div>
      </section>
    </>
  );
}
