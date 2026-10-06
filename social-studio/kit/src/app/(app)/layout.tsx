import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { Nav } from "@/components/nav";
import { Logo } from "@/components/ui";
import { requireSession } from "@/lib/session";
import { isEmailVerified } from "@/lib/email-tokens";
import { workspacePlan } from "@/lib/plans";
import { isPlaceholderEmail } from "@/lib/social-auth";
import { VerifyEmailBanner } from "@/components/verify-banner";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Cada página vuelve a comprobar la sesión: el layout no se re-renderiza en todas las navegaciones
  const session = await requireSession();
  const plan = workspacePlan(session.workspaceId);
  const initial = (session.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-2">
        Saltar al contenido
      </a>
      <aside className="sticky top-0 z-20 border-b border-line bg-bg/80 p-3 backdrop-blur-xl md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:p-5">
        <div className="mb-3 flex items-center justify-between px-1 md:mb-8 md:px-1">
          <Logo href="/panel" />
          <form action="/api/auth/logout" method="post" className="md:hidden">
            <button className="btn-ghost btn-sm" aria-label="Cerrar sesión">
              <LogOut size={14} aria-hidden />
            </button>
          </form>
        </div>
        <Link href="/nuevo" className="btn-primary mb-6 hidden w-full md:flex">
          <Plus size={15} aria-hidden /> Nueva publicación
        </Link>
        <p className="eyebrow mb-2 hidden px-3 md:block">Estudio</p>
        <Nav isAdmin={session.isAdmin} />
        <div className="mt-auto hidden md:block">
          <div className="hairline mb-4" />
          <div className="flex items-center gap-3 px-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2 font-serif text-lg">{initial}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={session.name}>
                {session.name}
              </p>
              <Link href="/ajustes" className="font-mono text-[11px] tracking-wider text-muted uppercase hover:text-accent">
                Plan {plan}
              </Link>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut size={15} aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-10">
        {!isEmailVerified(session.userId) && !isPlaceholderEmail(session.email) && <VerifyEmailBanner email={session.email} />}
        {children}
      </main>
    </div>
  );
}
