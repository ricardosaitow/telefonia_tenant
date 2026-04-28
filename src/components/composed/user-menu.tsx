"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { signoutFormAction } from "@/features/auth/signout-form-action";

/**
 * Menu do avatar — 8c minimal. Em 8d vira Popover do Radix. Por ora:
 * `useState` + click-outside listener via ref. Acessível por teclado
 * via Tab; ESC fecha.
 *
 * Item: nome+email + toggle tema + sair.
 */
type UserMenuProps = {
  name: string;
  email: string;
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function UserMenu({ name, email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isDark = resolvedTheme === "dark";

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="bg-glass-bg border-glass-border h-9 gap-2 rounded-md border px-2"
      >
        <span className="bg-primary text-primary-foreground font-display flex size-7 items-center justify-center rounded-md text-xs font-semibold">
          {initials(name) || "·"}
        </span>
        <span className="text-foreground hidden text-sm font-medium sm:inline">{name}</span>
      </Button>

      {open ? (
        <div
          role="menu"
          className="glass-panel shadow-modal absolute top-full right-0 z-50 mt-2 flex w-64 flex-col rounded-lg p-2"
        >
          <div className="px-3 py-2">
            <p className="text-foreground text-sm font-medium">{name}</p>
            <p className="text-muted-foreground truncate text-xs">{email}</p>
          </div>

          <div className="border-divider my-1 border-t" />

          <button
            type="button"
            role="menuitem"
            className="hover:bg-glass-bg text-foreground rounded-md px-3 py-2 text-left text-sm transition-colors"
            onClick={() => {
              setTheme(isDark ? "light" : "dark");
              setOpen(false);
            }}
          >
            Mudar pra tema {isDark ? "claro" : "escuro"}
          </button>

          <div className="border-divider my-1 border-t" />

          <form action={signoutFormAction}>
            <button
              type="submit"
              role="menuitem"
              className="hover:bg-glass-bg text-foreground w-full rounded-md px-3 py-2 text-left text-sm transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
