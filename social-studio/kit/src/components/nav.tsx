"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Calendar, ChartColumn, LayoutDashboard, Link2, ListVideo, Plus, Settings, ShieldCheck, Sparkles } from "lucide-react";

const LINKS = [
  { href: "/manny", label: "Manny", icon: Sparkles },
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/nuevo", label: "Nueva publicación", icon: Plus, mobileOnly: true },
  { href: "/calendario", label: "Calendario", icon: Calendar },
  { href: "/publicaciones", label: "Publicaciones", icon: ListVideo },
  { href: "/analitica", label: "Analítica", icon: ChartColumn },
  { href: "/cuentas", label: "Cuentas", icon: Link2 },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  // En móvil el menú es una fila con scroll: mantenemos visible la sección actual
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin", icon: ShieldCheck }] : LINKS;
  return (
    <nav ref={ref} aria-label="Principal" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
      {links.map(({ href, label, icon: Icon, ...rest }) => {
        const active = path === href || path.startsWith(`${href}/`);
        // «Nueva publicación» ya está como botón destacado arriba en escritorio
        const mobileOnly = "mobileOnly" in rest && rest.mobileOnly;
        return (
          <Link
            key={href}
            data-mobile-only={mobileOnly || undefined}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex ${mobileOnly ? "md:hidden" : ""} items-center gap-2.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors duration-200 ${
              active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg"
            }`}
          >
            {/* Marca de la sección actual: un filo de luz a la izquierda */}
            {active && (
              <span aria-hidden className="absolute top-2 bottom-2 -left-px hidden w-[2px] rounded-full brand-bg-v shadow-[0_0_10px_rgb(107_77_255/0.6)] md:block" />
            )}
            <Icon size={16} aria-hidden className={active ? "text-accent" : "transition-colors group-hover:text-fg"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
