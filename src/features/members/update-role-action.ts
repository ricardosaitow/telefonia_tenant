"use server";

import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { updateRoleInputSchema } from "./schemas";

/**
 * Muda role de uma membership. Owner/admin only.
 *
 * Guards:
 *  - Apenas owner pode promover/rebaixar OUTRO owner.
 *  - Não pode mudar próprio role (auto-promote / auto-demote).
 *  - Não pode rebaixar o ÚLTIMO owner ativo (lock-out).
 */
export async function updateMemberRoleAction(formData: FormData) {
  const parsed = updateRoleInputSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });
  if (!parsed.success) redirect("/members");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "tenant:manage_members");

  if (parsed.data.membershipId === ctx.membership.id) redirect("/members"); // auto-mutação bloqueada

  await prismaAdmin.$transaction(async (tx) => {
    const target = await tx.tenantMembership.findFirst({
      where: { id: parsed.data.membershipId, tenantId: ctx.activeTenantId },
      select: { id: true, globalRole: true, accountId: true },
    });
    if (!target) return;

    // Apenas owner mexe em owner.
    if (target.globalRole === "tenant_owner" && ctx.membership.globalRole !== "tenant_owner") {
      return;
    }
    if (parsed.data.role === "tenant_owner" && ctx.membership.globalRole !== "tenant_owner") {
      return;
    }

    // Não rebaixa último owner ativo.
    if (target.globalRole === "tenant_owner" && parsed.data.role !== "tenant_owner") {
      const owners = await tx.tenantMembership.count({
        where: {
          tenantId: ctx.activeTenantId,
          globalRole: "tenant_owner",
          status: "active",
        },
      });
      if (owners <= 1) return;
    }

    await tx.tenantMembership.update({
      where: { id: target.id },
      data: { globalRole: parsed.data.role },
    });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "membership.update_role",
        entityType: "tenant_membership",
        entityId: target.id,
        before: { role: target.globalRole },
        after: { role: parsed.data.role },
      },
    );
  });

  redirect("/members");
}
