import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { UserMenu } from "@/components/composed/user-menu";
import { prisma } from "@/lib/db/client";
import { assertSession, TenantNotSelectedError } from "@/lib/rbac";

/**
 * Layout do portal (logado COM tenant ativo). 8c minimal: header com lockup
 * + tenant atual + UserMenu. Sidebar completa + command palette vêm em 8d/e.
 *
 * Sem activeTenantId → redirect /tenants.
 */
export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  let ctx;
  try {
    ctx = await assertSession();
  } catch {
    redirect("/login");
  }

  if (!ctx.activeTenantId) {
    throw new TenantNotSelectedError();
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.activeTenantId },
    select: { slug: true, nomeFantasia: true },
  });
  // Tenant deletado / membership removida desde o login → volta pro picker.
  if (!tenant) redirect("/tenants");

  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="border-divider-strong bg-background/80 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Pekiart">
            <Image src="/brand/logo.webp" alt="" width={28} height={28} priority />
            <span className="font-display text-foreground text-sm font-semibold tracking-tight">
              telefonia<span className="text-accent-light">.ia</span>
            </span>
          </Link>
          <span className="text-divider-strong">/</span>
          <Link
            href="/tenants"
            className="font-display text-foreground hover:text-accent-light text-sm font-medium tracking-tight transition-colors"
            title="Trocar de tenant"
          >
            {tenant.nomeFantasia}
          </Link>
        </div>
        <UserMenu name={ctx.account.name} email={ctx.account.email} />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
