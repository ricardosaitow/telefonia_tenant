import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Alert — Pekiart glass-vibe.
 * - default: glass-panel.
 * - destructive: glass + acento destructive na borda esquerda.
 * - success: glass + acento (accent-light) na borda esquerda.
 */
const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-md px-4 py-3 text-sm has-[>svg]:[&_svg]:row-span-2 has-[>svg]:[&_svg]:translate-y-0.5 has-[>svg]:[&_svg]:size-4 [&:not(:has(>svg))]:grid-cols-1",
  {
    variants: {
      variant: {
        default: "glass-panel text-foreground",
        destructive: "glass-panel border-l-4 border-l-destructive text-foreground",
        success: "glass-panel border-l-4 border-l-accent-light text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-display text-sm font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="alert-action" className={cn("absolute top-2 right-2", className)} {...props} />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
