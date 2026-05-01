import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { UserMenu } from "@/components/composed/user-menu";
import { assertSession } from "@/lib/rbac";

/**
 * Layout pós-login SEM tenant ativo (tenants picker e flows similares).
 * Header simples (logo + user menu); sem sidebar (sidebar exige tenant).
 */
export default async function PostLoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  const ctx = await assertSession();

  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="border-divider-strong bg-background sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Pekiart">
          <Image src="/brand/logo.webp" alt="" width={28} height={28} priority />
          <span className="font-display text-foreground text-sm font-semibold tracking-tight">
            telefonia<span className="text-accent-light">.ia</span>
          </span>
        </Link>
        <UserMenu name={ctx.account.name} email={ctx.account.email} />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
