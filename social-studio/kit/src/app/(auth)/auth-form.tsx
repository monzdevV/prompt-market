"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";

/** Solo rutas internas: evita redirecciones abiertas a otras webs con ?next=https://… */
function safeNext(next: string | undefined) {
  if (!next || !next.startsWith("/") || /[\\\s]/.test(next)) return "/panel";
  try {
    const url = new URL(next, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search : "/panel";
  } catch {
    return "/panel";
  }
}

export function LoginForm({ next, heading = true }: { next?: string; heading?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { body: { email, password } });
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {heading && <h1 className="display text-3xl">Entrar</h1>}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" required autoFocus className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
        Entrar
      </button>
      <p className="text-center text-sm">
        <Link href="/recuperar" className="text-accent hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-accent hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({
  inviteRequired,
  invite,
  teamCode,
  heading = true,
}: {
  inviteRequired: boolean;
  invite?: string;
  teamCode?: string;
  heading?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", inviteCode: invite ?? "", acceptTerms: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", { body: { ...form, inviteCode: form.inviteCode || undefined, teamCode } });
      router.replace("/panel");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {heading && <h1 className="display text-3xl">{teamCode ? "Únete a tu equipo" : "Crear cuenta"}</h1>}
      {teamCode && <p className="text-sm text-muted">Usa el mismo email en el que recibiste la invitación.</p>}
      <div>
        <label className="label" htmlFor="name">
          Tu nombre o el de tu marca
        </label>
        <input id="name" autoComplete="name" required maxLength={100} className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" required className="input" value={form.email} onChange={(e) => set({ email: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          aria-describedby="pw-hint"
          className="input"
          value={form.password}
          onChange={(e) => set({ password: e.target.value })}
        />
        <p id="pw-hint" className="hint mt-1">
          Mínimo 10 caracteres.
        </p>
      </div>
      {inviteRequired && (
        <div>
          <label className="label" htmlFor="invite">
            Código de invitación
          </label>
          <input id="invite" required className="input" value={form.inviteCode} onChange={(e) => set({ inviteCode: e.target.value })} />
          <p className="hint mt-1">De momento el acceso es solo con invitación.</p>
        </div>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" required checked={form.acceptTerms} onChange={(e) => set({ acceptTerms: e.target.checked })} />
        <span>
          Tengo al menos 14 años y acepto los{" "}
          <Link href="/terminos" target="_blank" className="text-accent hover:underline">
            términos
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="text-accent hover:underline">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
        Crear cuenta
      </button>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
