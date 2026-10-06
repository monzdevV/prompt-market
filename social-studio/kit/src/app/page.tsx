import Link from "next/link";
import { ArrowRight, CalendarDays, ChartNoAxesColumn, Check, ImageIcon, RectangleVertical, ShieldCheck, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Logo, PlatformDot } from "@/components/ui";
import { getSession } from "@/lib/session";

const TICKER = ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook", "Historias", "Portadas", "Calendario", "Analítica", "Vertical 9:16"];

const STEPS = [
  { n: "01", title: "Sube el vídeo", text: "Arrástralo desde el ordenador o el móvil. Si es horizontal, lo pasamos a vertical en un clic." },
  { n: "02", title: "Escribe (o deja que lo escriba la IA)", text: "Título, descripción y hashtags. Con Pro o Business, la IA lo saca de lo que dices en el propio vídeo." },
  { n: "03", title: "Elige dónde y cuándo", text: "Reel, Short, historia o vídeo en cada red. Publícalo ya o prográmalo para la semana." },
];

const FEATURES = [
  {
    icon: RectangleVertical,
    title: "Cada red, su formato",
    text: "Short o vídeo en YouTube; Reel, solo Reels o historia en Instagram; vídeo, Reel o historia en Facebook. Te avisamos si no encaja.",
    wide: true,
  },
  { icon: ImageIcon, title: "Portada a tu gusto", text: "Elige el fotograma exacto o sube tu imagen." },
  { icon: CalendarDays, title: "Calendario", text: "Programa la semana entera de una sentada." },
  { icon: ChartNoAxesColumn, title: "Métricas sin trampas", text: "Si una red no da un dato, lo decimos. Nunca un cero inventado." },
  { icon: ShieldCheck, title: "Tus cuentas, seguras", text: "Permisos cifrados y revocables. Desconectas cuando quieras." },
  {
    icon: Sparkles,
    title: "Texto SEO con IA",
    text: "Transcribimos tu vídeo y escribimos el título, la descripción y 4 hashtags del nicho con tus propias palabras.",
    badge: "Pro y Business",
    full: true,
  },
];

/** Maqueta del estudio: el vídeo en vertical y cómo sale en cada red (solo decoración, sin datos reales). */
function StudioPreview() {
  const rows = [
    { p: "instagram" as const, label: "Reel", status: "Publicada", ok: true },
    { p: "tiktok" as const, label: "Vídeo", status: "Publicada", ok: true },
    { p: "youtube" as const, label: "Short", status: "Publicando…", ok: false },
    { p: "facebook" as const, label: "Historia", status: "Mañana 18:00", ok: false },
  ];
  return (
    <div aria-hidden className="rise relative mx-auto mt-16 max-w-4xl [--d:450ms]">
      <div className="absolute top-1/2 left-1/2 h-[120%] w-[90%] rounded-full bg-accent/10 blur-[90px]" style={{ animation: "halo 7s ease-in-out infinite" }} />
      <div className="card relative grid gap-6 overflow-hidden p-4 sm:grid-cols-[180px_1fr] sm:p-6">
        {/* Teléfono */}
        <div className="relative mx-auto aspect-[9/16] w-40 overflow-hidden rounded-[22px] border border-line-strong bg-gradient-to-b from-surface-3 via-surface to-bg sm:w-full">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_top,rgb(94_233_255/0.22),transparent_70%)]" />
          <div className="absolute inset-x-3 bottom-3 space-y-1.5">
            <div className="h-1.5 w-4/5 rounded-full bg-fg/70" />
            <div className="h-1.5 w-3/5 rounded-full bg-fg/40" />
            <div className="flex gap-1 pt-1">
              {["#reels", "#seo", "#vlog"].map((t) => (
                <span key={t} className="rounded-full bg-fg/10 px-1.5 py-0.5 font-mono text-[8px] text-fg/70">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 top-0 h-full overflow-hidden">
            <div className="h-1/3 w-full bg-gradient-to-b from-transparent via-accent/10 to-transparent" style={{ animation: "scan 4.5s linear infinite" }} />
          </div>
        </div>
        {/* Destinos */}
        <div className="flex flex-col justify-center gap-3">
          <p className="eyebrow">Publicación · 1 vídeo → 4 redes</p>
          <p className="display text-2xl sm:text-3xl">«Cómo edito un vídeo en 5 minutos»</p>
          <div className="hairline my-1" />
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.p} className="flex items-center gap-3 rounded-xl border border-line bg-bg-2/60 px-3 py-2">
                <PlatformDot platform={r.p} size={22} />
                <span className="text-sm">{r.label}</span>
                <span
                  className={`ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide ${r.ok ? "text-ok" : r.status.startsWith("Publicando") ? "text-warn" : "text-accent"}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await getSession();
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <header className="sticky top-3 z-30 mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-5xl items-center justify-between rounded-full border border-line bg-bg/70 px-3 py-2 pl-4 backdrop-blur-xl">
        <Logo />
        <nav className="flex items-center gap-1.5">
          {session ? (
            <Link href="/panel" className="btn-primary">
              Ir al panel <ArrowRight size={14} aria-hidden />
            </Link>
          ) : (
            <>
              <Link href="/precios" className="btn hidden text-muted hover:text-fg sm:inline-flex">
                Planes
              </Link>
              <Link href="/entrar" className="btn text-muted hover:text-fg">
                Entrar
              </Link>
              <Link href="/registro" className="btn-primary">
                Empezar gratis
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative px-4 pt-20 pb-10 text-center md:pt-28">
          {/* Cuadrícula tenue que se desvanece hacia abajo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_30%,black,transparent)]"
            style={{
              backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <p className="rise eyebrow inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            Un vídeo · cuatro redes
          </p>
          <h1 className="rise display mx-auto mt-6 max-w-4xl text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] text-balance [--d:80ms]">
            Súbelo una vez.
            <br />
            <span className="brand-text pr-2 italic">Que salga en todas.</span>
          </h1>
          <p className="rise mx-auto mt-6 max-w-xl text-base text-pretty text-muted md:text-lg [--d:180ms]">
            Publica y programa en Instagram, TikTok, YouTube, Facebook y X desde un solo sitio, con el formato y la portada que cada red
            necesita.
          </p>
          <div className="rise mt-9 flex flex-wrap justify-center gap-3 [--d:260ms]">
            <Link href={session ? "/nuevo" : "/registro"} className="btn-primary h-11 px-6 text-[15px]">
              {session ? "Subir un vídeo" : "Empezar gratis"} <ArrowRight size={15} aria-hidden />
            </Link>
            {!session && (
              <Link href="/entrar" className="btn-ghost h-11 px-6 text-[15px]">
                Entrar con TikTok o YouTube
              </Link>
            )}
          </div>
          <p className="rise mt-4 font-mono text-[11px] tracking-wider text-faint uppercase [--d:320ms]">Gratis para siempre · todo menos la IA · sin tarjeta</p>
          <StudioPreview />
        </section>

        {/* Cinta de formatos */}
        <div aria-hidden className="relative my-10 overflow-hidden border-y border-line bg-bg-2/60 py-4 [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
          <div className="flex w-max gap-10 font-mono text-xs tracking-[0.2em] text-muted uppercase" style={{ animation: "ticker 38s linear infinite" }}>
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-10">
                {t} <span className="text-accent">✦</span>
              </span>
            ))}
          </div>
        </div>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <p className="eyebrow">Cómo funciona</p>
          <h2 className="display mt-3 max-w-2xl text-4xl leading-tight md:text-5xl">
            Tres pasos. <span className="italic text-muted">Ni uno más.</span>
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-surface p-6 md:p-8">
                <span className="font-mono text-xs text-accent">{s.n}</span>
                <h3 className="display mt-6 text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm text-pretty text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <p className="eyebrow">Qué incluye</p>
          <h2 className="display mt-3 max-w-2xl text-4xl leading-tight md:text-5xl">
            Hecho para quien publica <span className="italic text-muted">todos los días.</span>
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, badge, wide, full }) => (
              <div key={title} className={`card card-hover p-6 ${full ? "md:col-span-3" : wide ? "md:col-span-2" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-surface-2 text-accent">
                    <Icon size={18} aria-hidden />
                  </span>
                  {badge && <span className="rounded-full border border-accent/40 px-2 py-0.5 font-mono text-[10px] tracking-widest text-accent uppercase">{badge}</span>}
                </div>
                <h3 className="display mt-6 text-2xl">{title}</h3>
                <p className="mt-2 max-w-md text-sm text-pretty text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="card relative overflow-hidden px-6 py-14 text-center md:py-20">
            <div aria-hidden className="absolute top-0 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[80px]" />
            <h2 className="display relative mx-auto max-w-2xl text-4xl leading-tight text-balance md:text-6xl">
              Tu próximo vídeo, <span className="italic">en todas partes.</span>
            </h2>
            <ul className="relative mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted">
              {["Gratis: todo menos la IA", "Entra con TikTok o YouTube", "Cancela cuando quieras"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={14} className="text-accent" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link href={session ? "/nuevo" : "/registro"} className="btn-primary h-11 px-6">
                {session ? "Subir un vídeo" : "Crear mi cuenta"} <ArrowRight size={15} aria-hidden />
              </Link>
              <Link href="/precios" className="btn-ghost h-11 px-6">
                Ver planes
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
