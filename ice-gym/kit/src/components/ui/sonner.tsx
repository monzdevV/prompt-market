"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle, Info, Warning, XCircle, CircleNotch } from "@phosphor-icons/react"

/**
 * Avisos con la estética de un rótulo de retransmisión: placa opaca, sin
 * esquinas redondeadas ni sombra difusa, y colores sacados de los tokens.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CheckCircle className="size-4" weight="light" />,
        info: <Info className="size-4" weight="light" />,
        warning: <Warning className="size-4" weight="light" />,
        error: <XCircle className="size-4" weight="light" />,
        loading: <CircleNotch className="size-4 animate-spin" weight="light" />,
      }}
      style={
        {
          "--normal-bg": "var(--tinta)",
          "--normal-text": "var(--fondo)",
          "--normal-border": "var(--tinta)",
          "--border-radius": "0px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!shadow-none font-sans",
          title: "font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
