import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-linea bg-placa px-2.5 py-1 text-base text-tinta transition-[border-color,box-shadow] duration-150 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-tinta placeholder:text-tinta-2 focus-visible:border-acento focus-visible:ring-3 focus-visible:ring-acento/30 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-placa-2 disabled:opacity-60 aria-invalid:border-critico aria-invalid:ring-3 aria-invalid:ring-critico/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
