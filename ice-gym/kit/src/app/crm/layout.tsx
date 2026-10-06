import { Suspense } from "react";
import { cookies } from "next/headers";
import { Barlow_Condensed, Hanken_Grotesk } from "next/font/google";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { BarraLateral, NavegacionInferior, TituloSeccion } from "@/components/crm/Navegacion";
import { InterruptorTema } from "@/components/crm/InterruptorTema";
import { ClaseCuerpo } from "@/components/crm/ClaseCuerpo";
import { BotonPaleta, PaletaComandos } from "@/components/crm/PaletaComandos";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogosCrear, MenuCrear } from "@/components/crm/dashboard/BotonCrear";
import { CabeceraApp } from "@/components/crm/CabeceraApp";
import { ETAPAS_ABIERTAS_B2B } from "@/lib/b2b";
import { catalogos as cargarCatalogos } from "@/lib/datos/b2b";
import { salir } from "./acciones/sesion";

// Texto: una grotesca con carácter propio (no la Inter de siempre).
// Cifras y titulares: la condensada del logotipo.
const texto = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-crm", display: "swap" });
const cifras = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-crm-display", display: "swap" });

export default async function LayoutCrm({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // El proxy ya ha validado la sesión: aquí basta con leer las claims del JWT.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const clases = `crm ${texto.variable} ${cifras.variable}`;
  const raiz = `${clases} min-h-dvh bg-fondo text-tinta`;

  // La pantalla de acceso se pinta entera, sin menú.
  if (!user) return <div className={raiz}>{children}</div>;

  // Contadores del menú y catálogos del botón «Crear», todo a la vez.
  const [oportunidades, tareas, catalogos, galletas] = await Promise.all([
    supabase.from("oportunidades").select("id", { count: "exact", head: true }).in("etapa", [...ETAPAS_ABIERTAS_B2B]),
    supabase.from("interacciones").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    cargarCatalogos(),
    cookies(),
  ]);
  const plegado = galletas.get("crm-menu")?.value === "plegado";
  const contadores = { oportunidades: oportunidades.count ?? 0, tareas: tareas.count ?? 0 };

  const nombre = String(user.email ?? "").split("@")[0];

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`${raiz} md:flex`}>
        <ClaseCuerpo clases={clases} />
        <a
          href="#contenido"
          className="sr-only z-50 rounded-md bg-acento px-4 py-2 text-sm text-sobre-campo focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
        >
          Saltar al contenido
        </a>

        <Suspense>
          <BarraLateral contadores={contadores} plegadoInicial={plegado} nombre={nombre} email={String(user.email ?? "")} />
        </Suspense>

        <div className="flex min-w-0 flex-1 flex-col">
          <CabeceraApp>
            <div className="md:hidden">
              <Suspense>
                <TituloSeccion />
              </Suspense>
            </div>
            <div className="hidden flex-1 md:block">
              <BotonPaleta />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="md:hidden">
                <BotonPaleta compacto />
              </div>
              <MenuCrear />
              <div className="md:hidden">
                <InterruptorTema />
              </div>
              <form action={salir} className="md:hidden">
                <button type="submit" aria-label="Salir" className="grid size-8 place-items-center rounded-md text-tinta-2">
                  <SignOut className="size-[18px]" aria-hidden />
                </button>
              </form>
            </div>
          </CabeceraApp>

          <div id="contenido" className="flex-1 pb-20 md:pb-0">
            {children}
          </div>
        </div>

        <Suspense>
          <NavegacionInferior contadores={contadores} />
          <PaletaComandos />
          <DialogosCrear catalogos={catalogos} />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
