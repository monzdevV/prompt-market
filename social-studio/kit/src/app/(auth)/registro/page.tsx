import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { inviteRequired } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { RegisterForm } from "../auth-form";
import { SocialButtons } from "../social-buttons";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  if (await getSession()) redirect("/panel");
  const sp = await searchParams;
  const invite = typeof sp.invitacion === "string" ? sp.invitacion : undefined;
  const team = typeof sp.equipo === "string" ? sp.equipo : undefined;
  return (
    <div className="space-y-5">
      {/* Con registro abierto se puede crear la cuenta con Google o TikTok (una invitación de equipo va por email) */}
      {!team && !inviteRequired() ? (
        <>
          <div>
            <h1 className="display text-3xl">Crear cuenta</h1>
            <p className="mt-1 text-sm text-muted">Gratis y sin tarjeta. En un clic con TikTok o YouTube.</p>
          </div>
          <SocialButtons />
          <RegisterForm inviteRequired={false} heading={false} />
        </>
      ) : (
        <RegisterForm inviteRequired={!team && inviteRequired()} invite={invite} teamCode={team} />
      )}
    </div>
  );
}
