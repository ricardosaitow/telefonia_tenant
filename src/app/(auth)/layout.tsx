import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Auth layout — dark deep + radial gradient + lockup Pekiart.
 * Replica vibe pekiart.com.br + Meet (primeira impressão da marca).
 *
 * Não usa toggle de tema aqui: auth pages SEMPRE em dark (decisão de marca,
 * mesmo que o portal logado siga preferência do usuário).
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="dark bg-background relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 [background:radial-gradient(ellipse_at_20%_20%,var(--accent-glow),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.08),transparent_50%),radial-gradient(ellipse_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8">
        <Link href="/" className="flex flex-col items-center gap-3" aria-label="Pekiart">
          <Image
            src="/brand/logo.webp"
            alt="Pekiart"
            width={64}
            height={64}
            priority
            className="drop-shadow-[0_0_24px_var(--accent-glow)]"
          />
          <span className="font-display text-foreground text-lg font-semibold tracking-tight">
            telefonia<span className="text-accent-light">.ia</span>
          </span>
        </Link>

        {children}
      </div>
    </div>
  );
}
