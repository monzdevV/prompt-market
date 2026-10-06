import { datosLanding } from "@/lib/datos/publico";
import { ScrollSuave } from "@/components/landing/ScrollSuave";
import { Cabecera } from "@/components/landing/Cabecera";
import { Portada } from "@/components/landing/Portada";
import { Manifiesto } from "@/components/landing/Manifiesto";
import { Instalaciones } from "@/components/landing/Instalaciones";
import { Cifras } from "@/components/landing/Cifras";
import { Tarifas } from "@/components/landing/Tarifas";
import { Centros } from "@/components/landing/Centros";
import { Clases } from "@/components/landing/Clases";
import { Visita } from "@/components/landing/Visita";
import { Pie } from "@/components/landing/Pie";

export default async function Inicio() {
  const datos = await datosLanding();

  return (
    <ScrollSuave>
      <div className="landing ruido min-h-dvh bg-fondo text-tinta">
        <Cabecera datos={datos} />
        <main>
          <Portada datos={datos} />
          <Manifiesto />
          <Instalaciones />
          <Cifras datos={datos} />
          <Tarifas datos={datos} />
          <Centros datos={datos} />
          <Clases datos={datos} />
          <Visita datos={datos} />
        </main>
        <Pie datos={datos} />
      </div>
    </ScrollSuave>
  );
}
