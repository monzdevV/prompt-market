import { SiteFooter } from "@/components/site-footer";
import { Logo } from "@/components/ui";

// Las páginas legales muestran LEGAL_NAME y CONTACT_EMAIL: se leen al servir, no al compilar,
// para que cambiar esas variables no exija recompilar (los revisores de Meta/Google las comprueban)
export const dynamic = "force-dynamic";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-3xl px-4 py-5">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
        <article className="rise space-y-4 text-sm leading-relaxed text-pretty text-fg/85 [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_b]:text-fg [&_h1]:font-serif [&_h1]:text-5xl [&_h1]:leading-tight [&_h1]:text-fg [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-fg [&_ul>li]:ml-5 [&_ul>li]:list-disc">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
