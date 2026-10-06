"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
      <MailCheck size={16} className="text-accent" aria-hidden />
      <span className="flex-1">
        Confirma tu email (<b>{email}</b>) con el enlace que te enviamos. Lo necesitarás para recuperar la contraseña y para gestionar tu plan.
      </span>
      <button
        className="btn-ghost btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/auth/verify", { method: "POST" });
            toast.success("Te lo hemos vuelto a enviar");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo enviar");
          } finally {
            setBusy(false);
          }
        }}
      >
        Reenviar email
      </button>
    </div>
  );
}
