"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/client-api";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset", { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Contraseña cambiada</h1>
        <p className="text-sm text-muted">Por seguridad hemos cerrado todas tus sesiones. Entra con la contraseña nueva.</p>
        <Link href="/entrar" className="btn-primary w-full">
          Entrar
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-lg font-semibold">Elige una contraseña nueva</h1>
      <div>
        <label className="label" htmlFor="password">
          Contraseña nueva
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="hint mt-1">Mínimo 10 caracteres.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy || !token}>
        Guardar contraseña
      </button>
    </form>
  );
}

export default function RestablecerPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
