import type { Metadata } from "next";
import Link from "next/link";
import { listAccounts } from "@/lib/accounts";
import { PageHeader } from "@/components/ui";
import { clientFeatures, publishingEnabled } from "@/lib/features";
import { maxUploadBytes } from "@/lib/media";
import { planHasAi } from "@/lib/plans";
import { isRelayed } from "@/lib/platforms/uploadpost";
import { youtubeCanUpload } from "@/lib/platforms/youtube";
import { requireSession } from "@/lib/session";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "Nueva publicación" };

export default async function NuevoPage({ searchParams }: PageProps<"/nuevo">) {
  const s = await requireSession();
  // ?fecha=YYYY-MM-DD desde el calendario (solo hoy o días futuros)
  const fecha = (await searchParams).fecha;
  const today = new Date().toLocaleDateString("sv-SE");
  const initialDate = typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha >= today ? fecha : undefined;
  const ai = planHasAi(s.workspaceId);
  const active = listAccounts(s.workspaceId).filter((a) => a.status === "active" && publishingEnabled(a.platform));
  // Canales de YouTube conectados solo para analítica: no se ofrecen hasta dar el permiso de subida
  const needUpload = active.filter((a) => a.platform === "youtube" && !youtubeCanUpload(a.granted_scopes));
  const accounts = active
    .filter((a) => !needUpload.includes(a))
    .map(({ id, platform, name, avatar, external_id }) => ({ id, platform, name, avatar, relayed: isRelayed({ external_id }) }));
  return (
    <>
      <PageHeader
        title="Nueva publicación"
        sub={
          ai
            ? "Sube el vídeo: lo transcribimos y la IA escribe el título, la descripción SEO y 4 hashtags del nicho a partir de lo que dices."
            : "Sube el vídeo, escribe el texto y publícalo en tus redes."
        }>
        <Link href="/nuevo/lote" className="btn-ghost">
          Programar varios vídeos
        </Link>
      </PageHeader>
      {accounts.length === 0 && (
        <div className="card mb-6 border-warn/40 bg-warn-soft p-4 text-sm text-warn">
          Aún no tienes redes conectadas. Puedes subir el vídeo y generar el texto, pero para publicar{" "}
          <Link href="/cuentas" className="font-medium underline">
            conecta tus cuentas
          </Link>
          .
        </div>
      )}
      {needUpload.length > 0 && (
        <div className="card mb-6 p-4 text-sm text-muted">
          Para publicar en {needUpload.map((a) => a.name).join(", ")} falta darnos permiso para subir vídeos:{" "}
          <a href="/api/oauth/youtube/start?permiso=publicar" className="font-medium text-fg underline">
            Autorizar publicación en YouTube
          </a>
          .
        </div>
      )}
      <Composer ai={ai} initialDate={initialDate} accounts={accounts} maxUploadMb={Math.round(maxUploadBytes() / 1024 / 1024)} features={clientFeatures()} />
    </>
  );
}
