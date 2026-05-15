import { cache } from "react";

import { MembershipRole } from "@/generated/prisma/client";
import { prismaAdmin } from "@/lib/db/admin-client";

/**
 * Shadow records — Fase 3 SSO Pekiart.
 *
 * Quando o user autentica via Logto, criamos (find-or-create) registros
 * locais espelhando a identidade do Logto:
 *  - `Account` (PK UUID) com `logtoSub = claims.sub`
 *  - `TenantMembership` (PK UUID) ligando Account + Tenant + role
 *
 * Isso permite que features legadas (chat, audit, etc) continuem usando
 * `accountId`/`membershipId` como UUID FK. Esses registros são populados
 * lazy — só quando user efetivamente entra no portal.
 *
 * Funções cacheadas via React.cache (por-request) pra evitar duplicação
 * dentro do mesmo render (layout + page).
 *
 * Ver docs/migration-logto-org-ids.md.
 */

/**
 * Find-or-create Account pra um user do Logto. Returns `{ id, email, nome }`.
 *
 * - Lookup primário: `logtoSub`.
 * - Se Account existe mas email/nome mudaram no Logto, atualiza (mantém UUID).
 * - Se não existe mas email já está em uso (legado), vincula logtoSub.
 * - Se não existe nenhum, cria com `passwordHash = null` (auth via Logto IdP).
 *
 * Args são primitivos (não objeto literal) pra React.cache deduplicar
 * corretamente entre layout + page no mesmo render. Cache compara por ===,
 * e objeto literal recém-criado nunca casaria.
 */
export const ensureAccount = cache(async (logtoSub: string, email: string, nome: string) => {
  const existing = await prismaAdmin.account.findUnique({
    where: { logtoSub },
    select: { id: true, email: true, nome: true },
  });

  if (existing) {
    if (existing.email !== email || existing.nome !== nome) {
      await prismaAdmin.account.update({
        where: { id: existing.id },
        data: { email, nome },
      });
    }
    return existing;
  }

  // Email pode colidir (UNIQUE) se alguém já cadastrou via Auth.js antes.
  // Vincula logtoSub ao Account existente.
  const byEmail = await prismaAdmin.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (byEmail) {
    const linked = await prismaAdmin.account.update({
      where: { id: byEmail.id },
      data: { logtoSub, nome },
      select: { id: true, email: true, nome: true },
    });
    return linked;
  }

  const created = await prismaAdmin.account.create({
    data: {
      logtoSub,
      email,
      nome,
      // passwordHash null — auth managed by Logto IdP.
    },
    select: { id: true, email: true, nome: true },
  });
  return created;
});

/**
 * Find-or-create TenantMembership pra (accountId, tenantId).
 * Role e status vêm do Logto (claims.organization_roles).
 *
 * Status sempre `active` quando criado via Logto (user já é membro da org
 * no Logto, autoritativo). Se já existir mas estiver inactive/invited,
 * promove pra active.
 */
export const ensureTenantMembership = cache(
  async (accountId: string, tenantId: string, globalRole: MembershipRole) => {
    const existing = await prismaAdmin.tenantMembership.findFirst({
      where: { accountId, tenantId },
      select: { id: true, status: true, globalRole: true },
    });

    if (existing) {
      // Sync se status/role mudou.
      if (existing.status !== "active" || existing.globalRole !== globalRole) {
        await prismaAdmin.tenantMembership.update({
          where: { id: existing.id },
          data: {
            status: "active",
            globalRole,
            joinedAt: existing.status === "active" ? undefined : new Date(),
            lastActiveAt: new Date(),
          },
        });
      } else {
        await prismaAdmin.tenantMembership.update({
          where: { id: existing.id },
          data: { lastActiveAt: new Date() },
        });
      }
      return { id: existing.id, globalRole };
    }

    const created = await prismaAdmin.tenantMembership.create({
      data: {
        accountId,
        tenantId,
        globalRole,
        status: "active",
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
      select: { id: true, globalRole: true },
    });
    return created;
  },
);
