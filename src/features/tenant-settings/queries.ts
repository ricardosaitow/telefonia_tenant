import "server-only";

import { withTenantContext } from "@/lib/db/tenant-context";

export type TenantSettings = {
  id: string;
  slug: string;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  dominioEmailPrincipal: string | null;
  defaultLocale: string;
  status: "trial" | "active" | "suspended" | "canceled";
  createdAt: Date;
};

/**
 * Busca dados completos do tenant ativo. Usa withTenantContext porque a
 * tabela `tenants` tem RLS no `id` (D002) — só vê o próprio.
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  return withTenantContext(tenantId, async (tx) => {
    const t = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        nomeFantasia: true,
        razaoSocial: true,
        cnpj: true,
        dominioEmailPrincipal: true,
        defaultLocale: true,
        status: true,
        createdAt: true,
      },
    });
    return t;
  });
}
