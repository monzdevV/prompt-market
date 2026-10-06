"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

/**
 * Lleva a Stripe: a la página de pago de un plan (`plan`) o al portal para gestionar la suscripción.
 * El servidor devuelve la URL de Stripe y el navegador va allí (Stripe no se abre en un iframe).
 */
export function BillingButton({ plan, children, className }: { plan?: "pro" | "business"; children: React.ReactNode; className?: string }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>(plan ? "/api/billing/checkout" : "/api/billing/portal", { body: plan ? { plan } : {} });
      window.location.assign(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el pago");
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={go} disabled={busy} className={className}>
      {busy && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
