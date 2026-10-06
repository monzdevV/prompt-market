import type { Metadata } from "next";
import Link from "next/link";
import { legalInfo } from "@/lib/legal";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = { title: "Política de cookies" };

/** Política de cookies (art. 22.2 LSSI). Solo hay una cookie técnica, exenta de consentimiento: no hace falta banner. */
export default function CookiesPage() {
  const l = legalInfo();
  return (
    <>
      <h1>Política de cookies</h1>
      <p className="text-muted">Última actualización: {l.updated}</p>

      <p>
        {APP_NAME} solo usa <b>una cookie técnica</b>, imprescindible para que puedas iniciar sesión. Según el artículo 22.2 de la LSSI,
        las cookies estrictamente necesarias para prestar un servicio que has pedido no requieren tu consentimiento, por eso no verás un
        aviso de cookies. No usamos cookies de analítica, de publicidad ni de terceros.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs [&_td]:border-t [&_td]:border-line [&_td]:p-2 [&_td]:align-top [&_th]:p-2 [&_th]:font-medium [&_th]:text-muted">
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Para qué</th>
              <th>Duración</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-mono">__Host-ss_session (o ss_session en local)</td>
              <td>Mantener tu sesión iniciada. Contiene un identificador aleatorio; no contiene datos personales.</td>
              <td>30 días o hasta cerrar sesión</td>
              <td>Propia, técnica</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Las tipografías se sirven desde nuestro propio servidor, así que tampoco hay cookies ni peticiones a servicios de fuentes de
        terceros. Si algún día añadimos cookies que necesiten tu consentimiento, te lo pediremos antes y actualizaremos esta página.
      </p>
      <p>
        Puedes borrar las cookies desde la configuración de tu navegador; si borras esta, tendrás que volver a iniciar sesión. Más
        información sobre tus datos en la <Link href="/privacidad">Política de privacidad</Link>.
      </p>
    </>
  );
}
