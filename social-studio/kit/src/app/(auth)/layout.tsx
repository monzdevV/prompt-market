import Link from "next/link";
import { FlowCanvas } from "@/components/flow-canvas";
import { Logo } from "@/components/ui";

/**
 * Pantallas de acceso: el fondo es una animación en Canvas 2D (corrientes con los colores de Manny).
 * En escritorio, a la izquierda la frase de marca sobre la animación; a la derecha el formulario.
 * En móvil la animación queda detrás del formulario, más tenue.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      <FlowCanvas className="absolute inset-0 h-full w-full opacity-40 lg:opacity-100 lg:[mask-image:linear-gradient(90deg,black_45%,transparent_75%)]" />
      <section className="relative hidden p-12 lg:flex lg:flex-col">
        <div className="relative">
          <Logo />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="eyebrow">Manny</p>
          <p className="display mt-4 text-6xl leading-[0.95] drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)]">
            Tu mánager
            <br />
            <span className="brand-text pr-2 italic">de redes.</span>
          </p>
          <p className="mt-6 text-sm text-muted">Qué grabar hoy, tus guiones, tus publicaciones y tus métricas en un solo sitio.</p>
        </div>
      </section>
      <section className="relative flex flex-col items-center justify-center gap-6 p-4 py-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="rise w-full max-w-sm rounded-2xl border border-line bg-surface/85 p-7 shadow-2xl backdrop-blur-xl">{children}</div>
        <Link href="/" className="font-mono text-[11px] tracking-wider text-faint uppercase hover:text-muted">
          ← Volver al inicio
        </Link>
      </section>
    </main>
  );
}
