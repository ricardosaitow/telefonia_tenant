import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea — alinhado com Input (mesmas classes glass + focus glow).
 * Auto-resize via field-sizing-content.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-glass-border bg-input text-foreground placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-md border px-3 py-2 text-sm transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-accent-light focus-visible:shadow-glow focus-visible:ring-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
