"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { revealExtensionPasswordAction } from "@/features/extensions/reveal-password-action";

type Props = {
  id: string;
  extension: string;
};

export function RevealPasswordButton({ id, extension }: Props) {
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reveal() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const result = await revealExtensionPasswordAction(fd);
      if (result.ok) {
        setPassword(result.password);
      } else {
        setError(result.error);
      }
    });
  }

  function hide() {
    setPassword(null);
  }

  function copy() {
    if (password) navigator.clipboard?.writeText(password);
  }

  if (password) {
    return (
      <div className="flex items-center gap-2">
        <code
          className="bg-muted rounded-md px-2 py-1 font-mono text-xs"
          aria-label={`Senha do ramal ${extension}`}
        >
          {password}
        </code>
        <Button type="button" size="sm" variant="ghost" onClick={copy} title="Copiar">
          <Copy className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={hide} title="Ocultar">
          <EyeOff className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={reveal} disabled={pending}>
        <Eye />
        {pending ? "..." : "Senha"}
      </Button>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}
