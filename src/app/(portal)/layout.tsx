import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PortalSidebar } from "@/components/composed/portal-sidebar";
import { UserMenu } from "@/components/composed/user-menu";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership, TenantNotSelectedError } from "@/lib/rbac";

/**
 * Layout do portal (logado COM tenant ativo).
 *
 * Header (h-14) limpo: lockup + tenant switcher + UserMenu.
 * Sidebar 240px (collapsable 56px) à esquerda — items vêm da PortalSidebar
 * (Client Component, filtra por role). Items "em breve" aparecem disabled
 * pra sinalizar roadmap.
 */
export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  let ctx;
  try {
    ctx = await assertSessionAndMembership();
  } catch (err) {
    if (err instanceof TenantNotSelectedError) redirect("/tenants");
    redirect("/login");
  }

  // Lê via withTenantContext: seta `app.current_tenant = activeTenantId`
  // ANTES da query — RLS de `tenants` (id = current_setting) aceita.
  const tenant = await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.tenant.findUnique({
      where: { id: ctx.activeTenantId },
      select: { slug: true, nomeFantasia: true },
    }),
  );
  if (!tenant) redirect("/tenants");

  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="border-divider-strong bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
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

        <div className="ml-auto">
          <UserMenu name={ctx.account.name} email={ctx.account.email} />
        </div>
      </header>

      <div className="flex flex-1">
        <PortalSidebar role={ctx.membership.globalRole} />
        <main className="flex flex-1 flex-col overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
