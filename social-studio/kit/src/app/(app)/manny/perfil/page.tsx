import type { Metadata } from "next";
import { ProfileForm } from "@/components/manny/profile-form";
import { PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/manny/profile";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const s = await requireSession();
  return (
    <>
      <PageHeader title="Mi perfil" sub="Manny lee esto en cada conversación y en cada guion que escribe. Cuanto más real sea, menos genéricos serán sus consejos." />
      <div className="max-w-3xl">
        <ProfileForm initial={getProfile(s.workspaceId)} />
      </div>
    </>
  );
}
