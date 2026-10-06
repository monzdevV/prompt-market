import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-linea bg-placa px-2.5 py-2 text-base text-tinta transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-tinta-2 focus-visible:border-acento focus-visible:ring-3 focus-visible:ring-acento/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-placa-2 disabled:opacity-60 aria-invalid:border-critico aria-invalid:ring-3 aria-invalid:ring-critico/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
