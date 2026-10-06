import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";
import { marca } from "@/lib/marca";

export const metadata: Metadata = {
  title: "Términos y licencia de uso",
  description: `Condiciones de compra y licencia de uso de los paquetes de ${marca.nombre}. Borrador.`,
  alternates: { canonical: "/legal/licencia" },
};

export default function Licencia() {
  const t = marca.titular;
  return (
    <PaginaLegal titulo="Términos y licencia de uso" actualizado="5 de octubre de 2026">
      <h2>1. Quién vende</h2>
      <p>
        Los paquetes los vende {t.nombre}, con NIF {t.nif} y domicilio en {t.domicilio} (en adelante, «{marca.nombre}»).
        Contacto: {t.email}.
      </p>

      <h2>2. Qué se compra</h2>
      <p>
        Cada producto es un paquete digital descargable: un prompt maestro (PROMPT.md), un mapa de personalización
        (PERSONALIZAR.md), una especificación (SPEC.md), una ficha (README.md) y una carpeta kit/ con código fuente. El
        precio es un pago único. El cobro lo gestiona Stripe; {marca.nombre} no recibe ni guarda los datos de tu tarjeta.
      </p>

      <h2>3. Licencia: un proyecto por compra</h2>
      <p>Al comprar un paquete recibes una licencia no exclusiva e intransferible que te permite:</p>
      <ul>
        <li>
          <strong>Montar un proyecto</strong> (una web, una app o un sistema, con una marca o un cliente) a partir del
          paquete, y modificarlo como quieras.
        </li>
        <li>
          Usarlo con fines <strong>personales o comerciales</strong>, también para un cliente tuyo, que puede quedarse
          el proyecto terminado.
        </li>
        <li>Volver a ejecutar el prompt sobre ese mismo proyecto tantas veces como necesites.</li>
      </ul>
      <p>Para cada proyecto adicional hace falta otra compra.</p>

      <h2>4. Qué no está permitido</h2>
      <ul>
        <li>Revender, sublicenciar, regalar o publicar el paquete, el prompt o el kit, enteros o en parte.</li>
        <li>
          Ofrecerlos como plantilla, curso, producto o servicio para que terceros los instalen (por ejemplo, subir el
          kit a un repositorio público o a otra tienda).
        </li>
        <li>Usar el prompt o el kit para crear un producto que compita con este marketplace.</li>
      </ul>
      <p>
        El proyecto terminado y personalizado sí puede publicarse: lo que no se puede distribuir es el material del
        paquete para que otros lo reutilicen.
      </p>

      <h2>5. Contenido de demo y terceros</h2>
      <p>
        Los kits incluyen datos, textos e imágenes de demostración que deben sustituirse antes de publicar, tal como
        indica cada ficha. Las librerías de código abierto que usan los kits conservan sus propias licencias. Los
        servicios externos (alojamiento, bases de datos, APIs de IA, tiendas de apps) tienen sus propias condiciones y
        costes, que corren de tu cuenta.
      </p>

      <h2>6. Resultado y garantías</h2>
      <p>
        Cada kit se ha verificado antes de publicarse como se indica en su ficha. El resultado final depende de tu IA,
        de tu equipo y de los servicios externos, que {marca.nombre} no controla. Si un paquete no funciona como se
        describe, escríbenos a {t.email} y te ayudaremos o te devolveremos el dinero según el caso.
      </p>

      <h2>7. Desistimiento</h2>
      <p>
        Por tratarse de contenido digital que se entrega de inmediato, al comprar aceptas expresamente que la entrega
        empiece al momento y reconoces que pierdes el derecho de desistimiento de 14 días, conforme al artículo 103.m)
        del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios.{" "}
        <strong>[Pendiente: confirmar con el profesional y recoger este consentimiento en el pago de Stripe.]</strong>
      </p>

      <h2>8. Ley aplicable</h2>
      <p>
        Estos términos se rigen por la ley española. Si eres consumidor, puedes acudir a los tribunales de tu domicilio.
      </p>
    </PaginaLegal>
  );
}
