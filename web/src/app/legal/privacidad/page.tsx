import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";
import { marca } from "@/lib/marca";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo trata ${marca.nombre} los datos personales. Borrador.`,
  alternates: { canonical: "/legal/privacidad" },
};

export default function Privacidad() {
  const t = marca.titular;
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="5 de octubre de 2026">
      <h2>1. Responsable</h2>
      <p>
        {t.nombre}, NIF {t.nif}, {t.domicilio}. Contacto para privacidad: {t.email}.
      </p>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Al navegar:</strong> esta web no usa cookies propias de analítica ni de publicidad, no tiene registro de
          usuarios y no guarda formularios. El alojamiento puede registrar datos técnicos (IP, navegador) para seguridad.
        </li>
        <li>
          <strong>Al comprar:</strong> el pago se hace en la página de Stripe. Stripe nos comunica tu nombre, tu email,
          tu país y el producto comprado para entregarte el paquete y emitir la factura. No vemos los datos de tu
          tarjeta.
        </li>
        <li>
          <strong>Si nos escribes:</strong> tu email y lo que nos cuentes, para responderte.
        </li>
      </ul>

      <h2>3. Para qué y con qué base</h2>
      <ul>
        <li>Entregar el paquete y dar soporte: ejecución del contrato de compra.</li>
        <li>Facturación y contabilidad: obligación legal.</li>
        <li>Responder consultas: tu consentimiento al escribirnos.</li>
      </ul>
      <p>No usamos tus datos para enviarte publicidad sin tu permiso ni para tomar decisiones automatizadas.</p>

      <h2>4. Cuánto tiempo</h2>
      <p>
        Los datos de compra se guardan el tiempo que exige la normativa fiscal y mercantil (en general, 6 años). Las
        consultas, mientras dure la conversación y un tiempo razonable después.
      </p>

      <h2>5. Con quién se comparten</h2>
      <ul>
        <li>Stripe Payments Europe, Ltd. (pagos).</li>
        <li>[Proveedor de alojamiento de la web, pendiente].</li>
        <li>[Proveedor de entrega de los archivos o email, pendiente].</li>
      </ul>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo con las garantías previstas
        en el RGPD (cláusulas contractuales tipo o decisiones de adecuación).
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {t.email}. Si
        crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos
        (aepd.es).
      </p>

      <h2>7. Lo que haces con tu IA</h2>
      <p>
        Los paquetes se ejecutan en tu IA y en tu ordenador. Lo que respondas durante la entrevista y las claves que
        pongas en tu proyecto no pasan por {marca.nombre}.
      </p>
    </PaginaLegal>
  );
}
