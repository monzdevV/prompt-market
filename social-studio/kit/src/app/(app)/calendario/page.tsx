import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { listPosts } from "@/lib/posts";
import { requireSession } from "@/lib/session";
import { CalendarGrid, type CalendarDay } from "./calendar-grid";

export const metadata: Metadata = { title: "Calendario" };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// La zona horaria del calendario es la del servidor (la app corre en un solo equipo)
export default async function CalendarioPage({ searchParams }: PageProps<"/calendario">) {
  const s = await requireSession();
  const m = (await searchParams).m;
  const now = new Date();
  const [y, mo] = typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const first = new Date(y, mo - 1, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // lunes de la primera semana
  const end = new Date(start);
  end.setDate(start.getDate() + 42);

  const posts = listPosts(s.workspaceId, { from: start.getTime(), to: end.getTime(), limit: 1000 }).sort((a, b) => a.scheduled_at - b.scheduled_at);
  const todayIso = iso(now);
  const days: CalendarDay[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = iso(d);
    return {
      date,
      day: d.getDate(),
      inMonth: d.getMonth() === mo - 1,
      today: date === todayIso,
      past: date < todayIso,
      posts: posts
        .filter((p) => iso(new Date(p.scheduled_at)) === date)
        .map((p) => ({
          id: p.id,
          title: p.title || p.description.slice(0, 80) || p.original_name,
          scheduledAt: p.scheduled_at,
          status: p.status,
          targets: p.targets.map((t) => ({ id: t.id, platform: t.platform, account: t.account_name, status: t.status, url: t.remote_url })),
        })),
    };
  });

  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const title = first.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Calendario" sub="Toca un día para programar en él, o un vídeo para cambiarlo.">
        <Link href={`?m=${fmt(new Date(y, mo - 2, 1))}`} className="btn-ghost w-9 px-0" aria-label="Mes anterior">
          <ChevronLeft size={16} aria-hidden />
        </Link>
        <span className="w-40 text-center font-serif text-xl capitalize" aria-live="polite">
          {title}
        </span>
        <Link href={`?m=${fmt(new Date(y, mo, 1))}`} className="btn-ghost w-9 px-0" aria-label="Mes siguiente">
          <ChevronRight size={16} aria-hidden />
        </Link>
        <Link href="/nuevo" className="btn-primary">
          <Plus size={16} aria-hidden /> Programar
        </Link>
      </PageHeader>
      <CalendarGrid days={days} />
    </>
  );
}
