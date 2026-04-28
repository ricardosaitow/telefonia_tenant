import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Button — Pekiart-vibe.
 * - Default = pill (rounded-full), font-display (Plus Jakarta), com glow no hover.
 * - Demais variants = radius médio + sem glow.
 * - Tokens semânticos only (regra design system).
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-display font-semibold tracking-wide outline-none transition-[background,box-shadow,transform,color,border-color] duration-150 select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-primary text-primary-foreground hover:-translate-y-px hover:bg-accent-light hover:shadow-glow active:translate-y-0",
        outline:
          "rounded-md border border-glass-border bg-glass-bg text-foreground backdrop-blur hover:border-accent-light hover:bg-glass-bg",
        secondary: "rounded-md bg-secondary text-secondary-foreground hover:bg-glass-bg",
        ghost: "rounded-md text-foreground hover:bg-glass-bg",
        destructive: "rounded-md bg-destructive text-destructive-foreground hover:opacity-90",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-3 text-sm",
        default: "h-10 px-5 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "size-10 rounded-md",
        "icon-sm": "size-8 rounded-md",
      },
    },
    compoundVariants: [
      // Pill buttons em sizes maiores também ficam pill quando variant=default.
      { variant: "default", size: "icon", className: "rounded-full" },
      { variant: "default", size: "icon-sm", className: "rounded-full" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
