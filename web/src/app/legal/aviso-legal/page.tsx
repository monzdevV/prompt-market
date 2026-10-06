import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";
import { marca } from "@/lib/marca";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: `Datos del titular de ${marca.nombre} y condiciones de uso de la web. Borrador.`,
  alternates: { canonical: "/legal/aviso-legal" },
};

export default function AvisoLegal() {
  const t = marca.titular;
  return (
    <PaginaLegal titulo="Aviso legal" actualizado="5 de octubre de 2026">
      <h2>1. Titular de la web</h2>
      <p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información (LSSI):</p>
      <ul>
        <li>Titular: {t.nombre}</li>
        <li>NIF: {t.nif}</li>
        <li>Domicilio: {t.domicilio}</li>
        <li>Email: {t.email}</li>
        <li>[Datos registrales, si se constituye una sociedad]</li>
      </ul>

      <h2>2. Uso de la web</h2>
      <p>
        La web muestra el catálogo de paquetes de {marca.nombre} y enlaza al pago de Stripe. Usarla implica aceptar este
        aviso. Hay que usarla de buena fe y sin intentar acceder a contenido no publicado.
      </p>

      <h2>3. Propiedad intelectual</h2>
      <p>
        Los textos, el diseño, los prompts y los kits son de {marca.nombre} o se usan con permiso. La vista previa de
        cada prompt se muestra solo para que puedas valorar la compra; no se puede copiar ni reutilizar. Los nombres de
        herramientas de IA (Claude Code, Cursor, ChatGPT y otros) se citan solo para indicar compatibilidad y pertenecen
        a sus titulares, sin que exista relación con ellos.
      </p>

      <h2>4. Responsabilidad</h2>
      <p>
        {marca.nombre} procura que la información sea correcta y esté al día, pero los requisitos y precios de servicios
        de terceros que se citan pueden cambiar. Compruébalos antes de comprar.
      </p>

      <h2>5. Ley aplicable</h2>
      <p>Este aviso se rige por la ley española.</p>
    </PaginaLegal>
  );
}
