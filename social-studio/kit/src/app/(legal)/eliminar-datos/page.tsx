import type { Metadata } from "next";
import Link from "next/link";
import { legalInfo } from "@/lib/legal";

export const metadata: Metadata = { title: "Eliminar mis datos" };

/** Instrucciones de eliminación de datos (URL que piden Meta y TikTok en la revisión de la app). */
export default function EliminarDatosPage() {
  const l = legalInfo();
  return (
    <>
      <h1>Cómo eliminar tus datos</h1>

      <h2>Desde la app (inmediato)</h2>
      <ol className="ml-5 list-decimal space-y-1">
        <li>
          <Link href="/entrar">Entra en tu cuenta</Link>.
        </li>
        <li>Ve a <b>Ajustes</b> → <b>Borrar mi cuenta</b>.</li>
        <li>Confirma con tu contraseña (o escribiendo BORRAR si entraste con Google o TikTok).</li>
      </ol>
      <p>
        Se eliminan al momento tus vídeos, portadas, transcripciones, publicaciones, métricas y las conexiones (tokens) con Facebook,
        Instagram, TikTok y YouTube; en Google y TikTok retiramos también el acceso en la propia red. De las copias de seguridad
        desaparecen como máximo en {Number(process.env.BACKUP_KEEP) || 14} días.
      </p>

      <h2>Solo desconectar una red</h2>
      <p>
        En <b>Cuentas</b> pulsa «Desconectar»: borramos los permisos de esa red al instante. También puedes quitar el acceso desde la
        propia red (por ejemplo, en Facebook: Configuración → Integraciones empresariales; en TikTok: Ajustes → Seguridad → Apps
        con acceso; en Google: myaccount.google.com/permissions).
      </p>

      {l.email && (
        <>
          <h2>Por email</h2>
          <p>
            Si no puedes entrar, escríbenos a <a href={`mailto:${l.email}`}>{l.email}</a> desde el email de tu cuenta y la
            borraremos en un plazo máximo de 30 días.
          </p>
        </>
      )}

      <p className="text-muted">
        Lo que ya se publicó en las redes sociales no se borra con tu cuenta: elimínalo desde cada red si lo deseas.
      </p>
    </>
  );
}
