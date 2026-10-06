import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { Cabecera } from "@/components/Cabecera";
import { Pie } from "@/components/Pie";
import { marca } from "@/lib/marca";
import "./globals.css";

// Archivo con eje de anchura: la misma familia hace de rótulo estrecho y de texto.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--fuente-archivo", display: "swap" });
// Mono solo para medidas, rutas y comandos.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--fuente-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(marca.url),
  title: { default: `${marca.nombre} · ${marca.lema}`, template: `%s · ${marca.nombre}` },
  description: marca.descripcion,
  applicationName: marca.nombre,
  openGraph: { type: "website", locale: "es_ES", siteName: marca.nombre },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0d0f" },
    { media: "(prefers-color-scheme: light)", color: "#f6f6f4" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-ES" className={`${archivo.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <Cabecera />
        <main id="contenido">{children}</main>
        <Pie />
      </body>
    </html>
  );
}
