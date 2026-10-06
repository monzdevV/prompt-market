import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { listAccounts } from "@/lib/accounts";
import { clientFeatures, publishingEnabled } from "@/lib/features";
import { maxUploadBytes } from "@/lib/media";
import { planHasAi } from "@/lib/plans";
import { isRelayed } from "@/lib/platforms/uploadpost";
import { youtubeCanUpload } from "@/lib/platforms/youtube";
import { requireSession } from "@/lib/session";
import { BulkScheduler } from "./bulk";

export const metadata: Metadata = { title: "Programar en lote" };

export default async function LotePage() {
  const s = await requireSession();
  const features = clientFeatures();
  const accounts = listAccounts(s.workspaceId)
    .filter((a) => a.status === "active" && publishingEnabled(a.platform))
    .filter((a) => a.platform !== "youtube" || youtubeCanUpload(a.granted_scopes))
    // En lote todo se programa: TikTok por la conexión directa aún no admite programar
    .filter((a) => a.platform !== "tiktok" || isRelayed(a) || features.tiktokScheduling)
    .map(({ id, platform, name, avatar }) => ({ id, platform, name, avatar }));
  return (
    <>
      <PageHeader title="Programar en lote" sub="Sube varios vídeos a la vez y se reparten solos en las horas que elijas.">
        <Link href="/nuevo" className="btn-ghost">
          <ArrowLeft size={15} aria-hidden /> Un solo vídeo
        </Link>
      </PageHeader>
      <BulkScheduler accounts={accounts} ai={planHasAi(s.workspaceId)} maxUploadMb={Math.round(maxUploadBytes() / 1024 / 1024)} />
    </>
  );
}
