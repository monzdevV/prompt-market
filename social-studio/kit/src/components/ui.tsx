import Link from "next/link";
import type { Platform } from "@/lib/db";
import { APP_NAME } from "@/lib/app-name";

export const PLATFORM: Record<Platform, { label: string; color: string; short: string }> = {
  youtube: { label: "YouTube", color: "#e62117", short: "YT" },
  facebook: { label: "Facebook", color: "#1877f2", short: "FB" },
  instagram: { label: "Instagram", color: "#d62976", short: "IG" },
  // Gris oscuro con borde claro: visible también en modo oscuro
  tiktok: { label: "TikTok", color: "#1f1f1f", short: "TT" },
  linkedin: { label: "LinkedIn", color: "#0a66c2", short: "in" },
  x: { label: "X", color: "#000000", short: "X" },
};

export function PlatformDot({ platform, size = 22 }: { platform: Platform; size?: number }) {
  const p = PLATFORM[platform];
  return (
    <span
      role="img"
      aria-label={p.label}
      title={p.label}
      className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white ring-1 ring-white/15"
      style={{ background: p.color, width: size, height: size, fontSize: size * 0.42 }}
    >
      {p.short}
    </span>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Programada", cls: "bg-accent-soft text-accent" },
  pending: { label: "Pendiente", cls: "bg-accent-soft text-accent" },
  publishing: { label: "Publicando…", cls: "bg-warn-soft text-warn" },
  done: { label: "Publicada", cls: "bg-ok-soft text-ok" },
  published: { label: "Publicada", cls: "bg-ok-soft text-ok" },
  partial: { label: "Revisar", cls: "bg-warn-soft text-warn" },
  needs_review: { label: "Comprobar", cls: "bg-warn-soft text-warn" },
  failed: { label: "Error", cls: "bg-bad-soft text-bad" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-surface-2 text-muted" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide whitespace-nowrap ${s.cls}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export function PageHeader({ title, sub, eyebrow, children }: { title: string; sub?: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-4xl leading-[1.05] text-balance md:text-5xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm text-pretty text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "bad" }) {
  return (
    <div className="card card-hover p-5">
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 font-serif text-4xl leading-none tabular-nums ${tone === "bad" ? "text-bad" : ""}`}>{value}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-2 overflow-hidden px-6 py-14 text-center">
      <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface-2 text-accent">{icon}</div>
      <p className="display relative mt-2 text-2xl">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action && (
        <Link href={action.href} className="btn-primary mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2" aria-label={`${APP_NAME}, ir al inicio`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- icono pequeño y fijo; no necesita optimización */}
      <img src="/brand/manny-mark.png" alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-[9px] transition-transform duration-300 group-hover:rotate-[-6deg]" />
      <span className="text-[17px] font-semibold tracking-[-0.02em]">
        <span className="brand-text">{APP_NAME}</span>
      </span>
    </Link>
  );
}

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const fmtNum = (n: number) => new Intl.NumberFormat("es-ES", { notation: n >= 10000 ? "compact" : "standard" }).format(n);
