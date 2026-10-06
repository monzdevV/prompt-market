import type { Metadata } from "next";
import Link from "next/link";
import { legalInfo, MIN_AGE } from "@/lib/legal";
import { AvisoPendiente, Dato } from "../pendiente";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = { title: "Términos y condiciones" };

/** Condiciones generales de contratación y uso (Ley 34/2002, RDL 1/2007 de consumidores y usuarios). */
export default function TerminosPage() {
  const l = legalInfo();
  return (
    <>
      <h1>Términos y condiciones</h1>
      <p className="text-muted">Última actualización: {l.updated}</p>
      <AvisoPendiente />

      <h2>1. Quiénes somos</h2>
      <p>
        {APP_NAME} lo presta <Dato value={process.env.LEGAL_NAME?.trim() ?? ""} label="nombre o razón social" /> (NIF{" "}
        <Dato value={l.id} label="NIF" />, domicilio <Dato value={l.address} label="domicilio" />
        ). Puedes contactar en {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : <Dato value="" label="email de contacto" />}. Al
        crear una cuenta aceptas estos términos.
      </p>

      <h2>2. El servicio</h2>
      <p>
        {APP_NAME} te permite subir vídeos y publicarlos o programarlos en las redes sociales que conectes (Instagram, Facebook, TikTok,
        YouTube y X), elegir el formato y la portada en cada una, convertirlos a vertical y ver su analítica.
      </p>
      <ul>
        <li><b>Plan Free (gratis)</b>: incluye todas las funciones salvo la inteligencia artificial.</li>
        <li>
          <b>Planes Pro y Business (de pago)</b>: añaden la inteligencia artificial, que transcribe tu vídeo y propone el título, la
          descripción y los hashtags, con el número de usos al mes que indica la página de <Link href="/precios">Planes</Link>.
        </li>
      </ul>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>Debes tener al menos {MIN_AGE} años. Para contratar un plan de pago tienes que ser mayor de edad.</li>
        <li>Los datos que nos des deben ser ciertos. Eres responsable de guardar tu contraseña y de la actividad de tu cuenta.</li>
        <li>Solo puedes conectar cuentas de redes sociales en las que tengas derecho a publicar.</li>
      </ul>

      <h2>4. Tu contenido</h2>
      <ul>
        <li>
          Los vídeos, textos e imágenes que subes son tuyos. Nos das un permiso limitado, no exclusivo y gratuito para guardarlos,
          procesarlos (por ejemplo, convertirlos a vertical o transcribirlos) y publicarlos donde y cuando tú indiques, solo para prestarte
          el servicio.
        </li>
        <li>
          Eres responsable de lo que publicas: debes tener los derechos del vídeo, la música y las imágenes, y cumplir las normas de cada
          red, incluidas las de contenido de marca y publicidad.
        </li>
        <li>Los textos que propone la IA son sugerencias y pueden contener errores: revísalos antes de publicar.</li>
      </ul>

      <h2>5. Uso aceptable</h2>
      <p>
        No puedes usar {APP_NAME} para publicar contenido ilegal, que infrinja derechos de terceros, que incite al odio o a la violencia,
        spam o desinformación; para suplantar a otras personas; ni para intentar acceder a datos de otros usuarios, eludir los límites o
        sobrecargar el sistema. Podemos suspender o cerrar cuentas que incumplan estas normas, avisándote salvo que la ley o la gravedad
        del caso lo impidan.
      </p>

      <h2>6. Redes sociales de terceros</h2>
      <p>
        Publicar depende de las APIs de Instagram, Facebook, TikTok, YouTube y X (y, para algunas, de nuestro servicio de publicación, Upload-Post), que pueden cambiar, limitar o rechazar publicaciones. No
        garantizamos que una red acepte todas las publicaciones ni el alcance que tendrán. Al usar cada red aceptas también sus
        condiciones; al conectar YouTube aceptas las{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
          Condiciones de servicio de YouTube
        </a>
        .
      </p>

      <h2>7. Planes de pago, renovación y cancelación</h2>
      <ul>
        <li>Los precios, con los impuestos aplicables, se muestran antes de pagar. El pago lo procesa Stripe.</li>
        <li>
          La suscripción se renueva automáticamente cada periodo (mensual, salvo que se indique otro) hasta que la canceles. Puedes
          cancelar cuando quieras desde <b>Ajustes → Gestionar suscripción</b>: seguirás teniendo el plan hasta el final del periodo ya
          pagado y después pasarás al plan Free, sin perder tus publicaciones ni tus cuentas.
        </li>
        <li>Si cambiamos el precio de tu plan, te avisaremos con al menos 30 días de antelación y podrás cancelar antes de que se aplique.</li>
        <li>Si un cobro falla, Stripe lo reintentará; si no se consigue, tu cuenta pasará al plan Free.</li>
      </ul>

      <h2>8. Derecho de desistimiento</h2>
      <p>
        Si eres consumidor, puedes desistir de la contratación de un plan de pago en los 14 días naturales siguientes, sin dar
        explicaciones, escribiéndonos a {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "nuestro email de contacto"}. Te
        devolveremos el importe en un máximo de 14 días por el mismo medio de pago; si ya has usado el servicio durante ese tiempo, se
        descontará la parte proporcional al periodo usado.
      </p>

      <h2>9. Disponibilidad y responsabilidad</h2>
      <p>
        Hacemos lo posible para que {APP_NAME} funcione de forma continua y segura, pero puede haber interrupciones por mantenimiento,
        fallos o cambios de las redes sociales. En la medida en que lo permita la ley, no respondemos de daños indirectos ni del
        rendimiento de tus publicaciones. Nada de lo anterior limita los derechos que te reconoce la ley como consumidor.
      </p>

      <h2>10. Baja y borrado</h2>
      <p>
        Puedes borrar tu cuenta en cualquier momento desde <b>Ajustes</b>. Qué pasa con tus datos se explica en la{" "}
        <Link href="/privacidad">Política de privacidad</Link> y en <Link href="/eliminar-datos">Eliminar mis datos</Link>.
      </p>

      <h2>11. Cambios en estos términos</h2>
      <p>
        Si los cambiamos de forma importante, te avisaremos en la app o por email con antelación. Si no estás de acuerdo, puedes dejar
        de usar el servicio y borrar tu cuenta.
      </p>

      <h2>12. Ley aplicable</h2>
      <p>
        Estos términos se rigen por la ley española. Si eres consumidor, podrás acudir a los juzgados y tribunales de tu domicilio.
      </p>
    </>
  );
}
