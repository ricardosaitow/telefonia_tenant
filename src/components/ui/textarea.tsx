import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea — alinhado com Input (mesma focus ring, P005).
 * Auto-resize via field-sizing-content.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-glass-border bg-input text-foreground placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-md border px-3 py-2 text-sm transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
