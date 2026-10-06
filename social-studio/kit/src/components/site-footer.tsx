import Link from "next/link";
import { Logo } from "@/components/ui";

const LEGAL = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terminos", label: "Términos" },
  { href: "/eliminar-datos", label: "Eliminar mis datos" },
  { href: "/seguridad", label: "Seguridad" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-6 px-4 py-10">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Un vídeo, todas tus redes. Hecho en España.</p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {LEGAL.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-8 font-mono text-[11px] tracking-wider text-faint uppercase">© {new Date().getFullYear()} Manny</div>
    </footer>
  );
}
