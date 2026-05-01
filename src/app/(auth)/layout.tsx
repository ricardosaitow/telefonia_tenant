import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Auth layout — dark canvas + logo + card (P005 Linear pure).
 *
 * Não usa toggle de tema aqui: auth pages SEMPRE em dark (decisão de marca,
 * mesmo que o portal logado siga preferência do usuário).
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="dark bg-background flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <Link href="/" className="flex flex-col items-center gap-2" aria-label="telefon.ia">
          <Image src="/brand/logo.webp" alt="" width={48} height={48} priority />
          <span className="font-display text-foreground text-base font-semibold tracking-tight">
            telefon<span className="text-accent-light">.ia</span>
          </span>
        </Link>

        {children}
      </div>
    </div>
  );
}
