import type { Metadata } from "next";
import Link from "next/link";
import { legalInfo } from "@/lib/legal";
import { AvisoPendiente } from "../pendiente";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactoPage() {
  const l = legalInfo();
  return (
    <>
      <h1>Contacto</h1>
      <AvisoPendiente />
      <p>{APP_NAME} lo presta {l.name}.</p>
      {l.email ? (
        <p>
          Para dudas, soporte, privacidad o seguridad escríbenos a <a href={`mailto:${l.email}`}>{l.email}</a>. Respondemos en un
          plazo máximo de 2 días laborables.
        </p>
      ) : (
        <p>El email de contacto aún no está configurado.</p>
      )}
      <ul>
        <li>
          Privacidad: <Link href="/privacidad">política de privacidad</Link>
        </li>
        <li>
          Borrar tus datos: <Link href="/eliminar-datos">cómo eliminar tus datos</Link>
        </li>
        <li>
          Datos del titular: <Link href="/aviso-legal">aviso legal</Link>
        </li>
        <li>
          Seguridad: <Link href="/seguridad">cómo protegemos tus datos y cómo informarnos de un fallo</Link>
        </li>
      </ul>
    </>
  );
}
