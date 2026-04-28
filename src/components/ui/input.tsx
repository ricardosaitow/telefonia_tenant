import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — Pekiart glass-vibe.
 * - h-10 (alinha com Button default).
 * - bg-input (glass-bg sutil) + border-glass-border.
 * - focus: border-ring + shadow-glow.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-glass-border bg-input text-foreground placeholder:text-muted-foreground h-10 w-full min-w-0 rounded-md border px-3 py-2 text-sm transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-accent-light focus-visible:shadow-glow focus-visible:ring-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        "file:text-foreground file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
