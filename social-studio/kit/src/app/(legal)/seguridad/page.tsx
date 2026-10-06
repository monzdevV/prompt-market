import type { Metadata } from "next";
import { legalInfo } from "@/lib/legal";

export const metadata: Metadata = { title: "Seguridad" };

/** Describe solo medidas que están realmente implementadas en el código. */
export default function SeguridadPage() {
  const l = legalInfo();
  return (
    <>
      <h1>Seguridad</h1>
      <h2>Cómo protegemos tus datos</h2>
      <ul>
        <li>Los permisos de tus redes (tokens) se guardan cifrados (AES-256-GCM) y nunca se envían a tu navegador.</li>
        <li>Las contraseñas se guardan con un hash robusto (scrypt); nadie, ni nosotros, puede leerlas.</li>
        <li>Las sesiones usan cookies seguras (HttpOnly, SameSite) y en el servidor solo guardamos un hash de la sesión.</li>
        <li>Cada cliente solo puede ver sus propios datos: todas las consultas filtran por el espacio de trabajo de la sesión, y la base de datos además rechaza enlazar publicaciones, vídeos o cuentas de espacios distintos.</li>
        <li>Solo pedimos a cada red los permisos que usa la app, y al desconectar los retiramos cuando la red lo permite.</li>
        <li>Conexión cifrada (HTTPS), protección contra ataques de sitios cruzados y límites de intentos en el inicio de sesión.</li>
      </ul>
      <h2>¿Has encontrado un fallo de seguridad?</h2>
      {l.email ? (
        <p>
          Escríbenos a <a href={`mailto:${l.email}`}>{l.email}</a> con el asunto «Seguridad». Te responderemos lo antes posible y te
          pedimos que no lo hagas público hasta que lo hayamos corregido.
        </p>
      ) : (
        <p>El email de contacto aún no está configurado.</p>
      )}
    </>
  );
}
