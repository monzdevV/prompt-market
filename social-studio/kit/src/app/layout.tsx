import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  // URL pública para que la imagen de OpenGraph (src/app/opengraph-image.png) salga con dirección absoluta
  metadataBase: new URL(URL.canParse(process.env.APP_URL ?? "") ? process.env.APP_URL! : "http://localhost:3000"),
  applicationName: "Manny",
  title: { default: "Manny", template: "%s · Manny" },
  description: "Manny, tu mánager de redes: qué grabar, guiones, publicación y métricas de tus cuentas.",
  openGraph: {
    title: "Manny",
    siteName: "Manny",
    description: "Tu mánager de redes personal.",
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0b0d0e", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <div aria-hidden className="grain" />
        <Toaster
          position="bottom-right"
          theme="dark"
          closeButton
          toastOptions={{ style: { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" } }}
        />
      </body>
    </html>
  );
}
