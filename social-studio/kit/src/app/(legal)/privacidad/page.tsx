import type { Metadata } from "next";
import Link from "next/link";
import { legalInfo, MIN_AGE } from "@/lib/legal";
import { AvisoPendiente, Dato } from "../pendiente";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = { title: "Política de privacidad" };

const BACKUP_DAYS = Number(process.env.BACKUP_KEEP) || 14;
const RETENTION_DAYS = Number(process.env.UPLOAD_RETENTION_DAYS) || 30;

/** Política de privacidad (RGPD UE 2016/679 y LOPDGDD 3/2018). */
export default function PrivacidadPage() {
  const l = legalInfo();
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="text-muted">Última actualización: {l.updated}</p>
      <AvisoPendiente />
      <p>
        Aquí explicamos, sin letra pequeña, qué datos personales tratamos cuando usas {APP_NAME}, para qué, con quién los compartimos, cuánto
        tiempo los guardamos y cómo ejercer tus derechos.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          Responsable: <Dato value={process.env.LEGAL_NAME?.trim() ?? ""} label="nombre o razón social" /> (NIF <Dato value={l.id} label="NIF" />)
        </li>
        <li>
          Domicilio: <Dato value={l.address} label="domicilio" />
        </li>
        <li>
          Contacto para privacidad: {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : <Dato value="" label="email de contacto" />}
        </li>
      </ul>

      <h2>2. Qué datos tratamos, para qué y con qué base legal</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs [&_td]:border-t [&_td]:border-line [&_td]:p-2 [&_td]:align-top [&_th]:p-2 [&_th]:font-medium [&_th]:text-muted">
          <thead>
            <tr>
              <th>Datos</th>
              <th>Para qué</th>
              <th>Base legal (RGPD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Cuenta: nombre, email, contraseña (solo guardamos un hash irreversible), fecha de aceptación de estos textos. Si entras con
                Google: tu identificador de Google y tu email verificado. Si entras con TikTok: tu identificador de TikTok (TikTok no nos da
                tu email).
              </td>
              <td>Crear tu cuenta, que puedas entrar y avisarte de cosas de tu cuenta (verificación, recuperar la contraseña, invitaciones).</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Vídeos que subes, sus portadas, el texto de cada publicación y, con planes de IA, la transcripción y los textos propuestos.</td>
              <td>Prepararlos y publicarlos donde tú decidas, cuando tú decidas.</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Conexiones con tus redes: los permisos (tokens) que nos das, guardados cifrados, y qué permisos concretos aceptaste.</td>
              <td>Publicar en tus cuentas y leer su analítica, solo para las funciones que ves en la app.</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Analítica de las cuentas que conectas (detalle por red más abajo) y una foto diaria de esas cifras.</td>
              <td>Enseñarte la evolución de tus cuentas y publicaciones.</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Suscripción: plan, estado, fechas de renovación e identificador de cliente en Stripe. Nunca vemos ni guardamos los datos de tu tarjeta.</td>
              <td>Cobrar y gestionar los planes de pago; emitir y conservar facturas.</td>
              <td>Contrato (art. 6.1.b) y obligación legal fiscal y mercantil (art. 6.1.c)</td>
            </tr>
            <tr>
              <td>Datos técnicos: dirección IP (de forma pasajera, no se guarda en nuestra base de datos), registros de errores y un registro de acciones importantes de tu cuenta.</td>
              <td>Seguridad del servicio, evitar abusos (límites de intentos) y resolver fallos.</td>
              <td>Interés legítimo en la seguridad (art. 6.1.f)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>No vendemos tus datos, no los usamos para publicidad y no tomamos decisiones automatizadas con efectos jurídicos sobre ti.</p>

      <h3 className="mt-4 font-medium">Datos que leemos de cada red (solo de las cuentas que tú conectas)</h3>
      <ul>
        <li>Instagram: nombre de usuario, foto, seguidores, seguidos y número de publicaciones; publicaciones (texto, enlace, miniatura, fecha) y sus métricas (visualizaciones, alcance, me gusta, comentarios, compartidos, guardados); alcance y visualizaciones diarias de la cuenta.</li>
        <li>Facebook: nombre y foto de la Página, seguidores y los vídeos de la Página con sus me gusta y comentarios.</li>
        <li>TikTok: nombre, usuario, foto, seguidores, seguidos y número de vídeos; tus vídeos públicos (título, descripción, portada, enlace, fecha) y sus visualizaciones, me gusta, comentarios y compartidos.</li>
        <li>YouTube: nombre y foto del canal, suscriptores y número de vídeos; vídeos (título, miniatura, fecha) con sus visualizaciones, me gusta y comentarios; y métricas diarias del canal (visualizaciones, tiempo de visualización, me gusta, comentarios y compartidos).</li>
      </ul>

      <h2>3. Con quién los compartimos</h2>
      <p>Solo con los proveedores necesarios para prestar el servicio, que actúan como encargados del tratamiento o, en el caso de las redes, porque tú nos pides publicar en ellas:</p>
      <ul>
        <li><b>Las redes sociales que conectas</b> (Meta —Instagram y Facebook—, TikTok, Google —YouTube— y X): reciben el vídeo y el texto de cada publicación, solo cuando publicas.</li>
        <li>
          <b>Upload-Post</b> (TONVI TECH SL, España), nuestro servicio de publicación: cuando conectas tus redes en su página de conexión, guarda el permiso de esas
          redes y, cuando publicas, recibe el vídeo, el texto y la portada para enviarlos a cada red. Si borras tu cuenta, borramos
          también tu perfil en Upload-Post y, con él, sus conexiones a tus redes.
        </li>
        <li><b>Anthropic</b> (IA Claude), solo en los planes con IA: recibe la transcripción y los ajustes de tu marca para proponer el texto. La transcripción se hace en nuestro servidor: el vídeo no sale de él para eso.</li>
        <li><b>Stripe</b>, si contratas un plan de pago: procesa el pago y guarda tu tarjeta.</li>
        <li><b>Resend</b>: envía los emails de tu cuenta (verificación, recuperar la contraseña, invitaciones).</li>
        <li><b>Hetzner</b> (Hetzner Online GmbH, Alemania): aloja nuestro servidor, la base de datos y los vídeos, dentro de la UE.</li>
        <li><b>Cloudflare</b>: por su red pasa el tráfico entre tu navegador y nuestro servidor (protección y conexión segura).</li>
        <li>Autoridades, solo si una ley nos obliga.</li>
      </ul>
      <p>
        Algunos de estos proveedores están fuera del Espacio Económico Europeo (principalmente en EE. UU.). Las transferencias se hacen
        con las garantías del RGPD que ofrece cada proveedor, como el Marco de Privacidad de Datos UE-EE. UU. o las cláusulas
        contractuales tipo de la Comisión Europea.
      </p>

      <h2>4. Cuánto tiempo los guardamos</h2>
      <ul>
        <li>Datos de tu cuenta y contenido: mientras tengas la cuenta. Si la borras, se eliminan de inmediato de la base de datos.</li>
        <li>
          Copias de seguridad: hacemos una al día y guardamos las de los últimos {BACKUP_DAYS} días. Lo que borres desaparece de ellas
          como máximo en ese plazo.
        </li>
        <li>Vídeos ya publicados: el archivo se borra de nuestro servidor a los {RETENTION_DAYS} días (el vídeo sigue en la red donde lo publicaste).</li>
        <li>
          YouTube: los títulos, miniaturas y demás datos del canal se actualizan o se borran como máximo cada 30 días; si desconectas
          YouTube, borramos al momento todos los datos leídos de YouTube.
        </li>
        <li>Datos de facturación: el tiempo que exige la ley fiscal y mercantil (hasta 6 años).</li>
        <li>Sesiones: caducan a los 30 días o al cerrar sesión.</li>
      </ul>

      <h2>5. Tus derechos</h2>
      <p>
        Puedes pedir acceso a tus datos, rectificarlos, suprimirlos, limitar u oponerte a su tratamiento y llevártelos (portabilidad),
        escribiendo a {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "nuestro email de contacto"}. Te responderemos en un
        plazo máximo de un mes. Muchas cosas puedes hacerlas tú mismo:
      </p>
      <ul>
        <li>Desconectar una red: <b>Cuentas</b> → «Desconectar» (borramos sus permisos y, cuando la red lo permite —Google y TikTok—, también los retiramos en la propia red).</li>
        <li>Borrar tu cuenta y todos tus datos: <b>Ajustes</b> → «Borrar mi cuenta». Más detalles en <Link href="/eliminar-datos">Eliminar mis datos</Link>.</li>
        <li>
          Retirar el acceso desde cada red: Google en{" "}
          <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noreferrer">
            security.google.com/settings/security/permissions
          </a>
          , Facebook en Configuración → Integraciones empresariales, TikTok en Ajustes → Seguridad → Apps con acceso.
        </li>
      </ul>
      <p>
        Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (
        <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
          aepd.es
        </a>
        ).
      </p>

      <h2>6. Menores</h2>
      <p>{APP_NAME} no está dirigido a menores de {MIN_AGE} años. Para contratar un plan de pago hay que ser mayor de edad.</p>

      <h2>7. Seguridad</h2>
      <p>
        Cifrado en tránsito (HTTPS), permisos de las redes cifrados en la base de datos, contraseñas con hash, aislamiento entre
        cuentas y copias de seguridad diarias. Más detalles en <Link href="/seguridad">Seguridad</Link>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Solo usamos una cookie técnica imprescindible para mantener tu sesión. No usamos cookies de analítica ni de publicidad. Detalle
        en la <Link href="/cookies">Política de cookies</Link>.
      </p>

      <h2>9. YouTube y Google</h2>
      <p>
        {APP_NAME} usa los Servicios de API de YouTube. Al conectar YouTube aceptas las{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
          Condiciones de servicio de YouTube
        </a>{" "}
        y queda sujeto a la{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          Política de privacidad de Google
        </a>
        . El uso que hace {APP_NAME} de la información recibida de las APIs de Google se ajusta a la{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Política de datos de usuario de los servicios de API de Google
        </a>
        , incluidos los requisitos de uso limitado.
      </p>

      <h2>10. Cambios</h2>
      <p>Si cambiamos esta política de forma importante, te avisaremos en la app o por email antes de que se aplique.</p>
    </>
  );
}
