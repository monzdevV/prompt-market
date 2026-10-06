import type { Metadata } from "next";
import Link from "next/link";
import { isEmailVerified, verifyEmail } from "@/lib/email-tokens";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Verificar email" };

export default async function VerificarPage({ searchParams }: PageProps<"/verificar">) {
  const token = (await searchParams).token;
  const ok = typeof token === "string" && token.length <= 200 && verifyEmail(token);
  // Algunos correos (antivirus, «vínculos seguros») abren el enlace antes que tú y lo gastan:
  // si ya estás verificado, no te decimos que el enlace falló
  const session = ok ? null : await getSession();
  const already = !!session && isEmailVerified(session.userId);
  const done = ok || already;
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">{done ? "Email confirmado" : "El enlace no es válido"}</h1>
      <p className="text-sm text-muted">
        {done ? "Gracias. Tu email ya está confirmado." : "Puede que haya caducado o que ya lo usaras. Desde la app puedes pedir otro."}
      </p>
      <Link href="/panel" className="btn-primary w-full">
        Ir al panel
      </Link>
    </div>
  );
}
