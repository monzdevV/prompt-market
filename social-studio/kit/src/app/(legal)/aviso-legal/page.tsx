import type { Metadata } from "next";
import Link from "next/link";
import { legalInfo } from "@/lib/legal";
import { AvisoPendiente, Dato } from "../pendiente";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = { title: "Aviso legal" };

/** Aviso legal exigido por el art. 10 de la Ley 34/2002 (LSSI-CE). */
export default function AvisoLegalPage() {
  const l = legalInfo();
  return (
    <>
      <h1>Aviso legal</h1>
      <p className="text-muted">Última actualización: {l.updated}</p>
      <AvisoPendiente />

      <h2>1. Titular del sitio web</h2>
      <p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), se informa de que el titular de {APP_NAME} es:</p>
      <ul>
        <li>
          Titular: <Dato value={process.env.LEGAL_NAME?.trim() ?? ""} label="nombre o razón social" />
        </li>
        <li>
          NIF: <Dato value={l.id} label="NIF" />
        </li>
        <li>
          Domicilio: <Dato value={l.address} label="domicilio" />
        </li>
        <li>
          Email: {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : <Dato value="" label="email de contacto" />}
        </li>
        {l.registry && <li>Datos registrales: {l.registry}</li>}
      </ul>

      <h2>2. Objeto</h2>
      <p>
        {APP_NAME} es un servicio en línea para subir vídeos y publicarlos o programarlos en redes sociales (Instagram, Facebook, TikTok,
        YouTube y X) desde un solo sitio. Las condiciones de uso del servicio están en los <Link href="/terminos">Términos y condiciones</Link>{" "}
        y el tratamiento de datos personales en la <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>3. Propiedad intelectual e industrial</h2>
      <p>
        La marca {APP_NAME}, el logotipo, el diseño y el software del servicio pertenecen a su titular o se usan con licencia. No se permite
        copiarlos, distribuirlos ni transformarlos sin autorización. El contenido que subes (vídeos y textos) es tuyo: consulta los
        Términos para saber qué permiso nos das para procesarlo.
      </p>
      <p>
        Instagram, Facebook, TikTok, YouTube, X y sus logotipos son marcas de sus respectivos titulares. {APP_NAME} no está patrocinado ni
        respaldado por ellos: se conecta a sus servicios a través de sus APIs oficiales y con tu autorización.
      </p>

      <h2>4. Responsabilidad</h2>
      <p>
        El titular procura que la información del sitio sea correcta y que el servicio funcione de forma continua, pero no puede
        garantizar la ausencia de errores o interrupciones, en especial cuando dependen de redes sociales de terceros. Los enlaces a
        sitios de terceros se ofrecen solo como referencia; el titular no es responsable de su contenido.
      </p>

      <h2>5. Legislación aplicable</h2>
      <p>
        Este sitio se rige por la legislación española. Si eres consumidor, podrás acudir a los juzgados y tribunales de tu domicilio.
      </p>
    </>
  );
}
