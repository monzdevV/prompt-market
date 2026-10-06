"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client-api";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/forgot", { body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Revisa tu email</h1>
        <p className="text-sm text-muted">
          Si hay una cuenta con <b>{email}</b>, te hemos enviado un enlace para elegir una contraseña nueva. Caduca en 1 hora.
        </p>
        <Link href="/entrar" className="btn-ghost w-full">
          Volver a entrar
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-lg font-semibold">¿Olvidaste tu contraseña?</h1>
      <p className="text-sm text-muted">Te enviaremos un enlace para elegir una nueva.</p>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        Enviar enlace
      </button>
      <p className="text-center text-sm text-muted">
        <Link href="/entrar" className="text-accent hover:underline">
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}
