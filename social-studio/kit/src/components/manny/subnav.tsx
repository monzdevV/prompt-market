"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CalendarCheck, ClipboardPaste, Library, Lightbulb, MessageCircle, Radar, ScrollText, UserRound } from "lucide-react";

const TABS = [
  { href: "/manny", label: "Hoy", icon: CalendarCheck },
  { href: "/manny/copiar", label: "Copiar", icon: ClipboardPaste },
  { href: "/manny/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/manny/radar", label: "Radar", icon: Radar },
  { href: "/manny/guiones", label: "Guiones", icon: ScrollText },
  { href: "/manny/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/manny/chat", label: "Hablar con Manny", icon: MessageCircle },
  { href: "/manny/perfil", label: "Mi perfil", icon: UserRound },
];

/** Secciones de Manny: una fila con scroll en móvil que mantiene visible la sección actual. */
export function MannyNav() {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  return (
    <nav ref={ref} aria-label="Secciones de Manny" className="-mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/manny" ? path === href : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm whitespace-nowrap transition-colors duration-200 ${active ? "text-fg" : "text-muted hover:text-fg"}`}
          >
            <Icon size={15} aria-hidden className={active ? "text-accent" : ""} />
            {label}
            <span aria-hidden className={`absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-accent transition-[opacity,transform] duration-200 [transition-timing-function:var(--ease)] ${active ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0"}`} />
          </Link>
        );
      })}
    </nav>
  );
}
