import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "../auth-form";
import { SocialButtons } from "../social-buttons";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  if (await getSession()) redirect("/panel");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Con tu cuenta de TikTok o YouTube, o con tu email.</p>
      </div>
      <SocialButtons next={next} error={error} />
      <LoginForm next={next} heading={false} />
    </div>
  );
}
