import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:ring-acento/40 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-critico aria-invalid:ring-critico/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-acento text-sobre-campo [a]:hover:bg-acento/90",
        secondary:
          "bg-placa-2 text-tinta [a]:hover:bg-[color-mix(in_oklch,var(--placa-2),var(--tinta)_6%)]",
        destructive:
          "bg-critico-suave text-critico focus-visible:ring-critico/30",
        outline:
          "border-linea text-tinta [a]:hover:bg-placa-2",
        ghost:
          "text-tinta-2 hover:bg-placa-2 hover:text-tinta",
        link: "text-acento-tinta underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
