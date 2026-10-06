import { About } from "@/components/About";
import { Backdrop } from "@/components/Backdrop";
import { Contact } from "@/components/Contact";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Stack } from "@/components/Stack";
import { Starfield } from "@/components/Starfield";
import { Proyectos } from "@/components/proyectos/Proyectos";
import { esVariante } from "@/components/proyectos/variantes";

export default async function Home({ searchParams }: PageProps<"/">) {
  // The DNA helix is the projects section. ?proyectos=<id> previews the other layouts, with a switcher.
  const { proyectos } = await searchParams;
  const variante = esVariante(proyectos) ? proyectos : "helice";

  return (
    <>
      <Backdrop />
      <Starfield />
      <Nav />
      <main>
        <Hero />
        <About />
        <Proyectos variante={variante} selector={esVariante(proyectos)} />
        <Stack />
        <Contact />
      </main>
    </>
  );
}
