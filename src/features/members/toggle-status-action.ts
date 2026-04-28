"use server";

import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { toggleStatusInputSchema } from "./schemas";

/**
 * Desativa/reativa membership. Mesmas guards do update-role:
 * - Não pode mexer em próprio status.
 * - Apenas owner mexe em owner.
 * - Não pode desativar último owner ativo.
 */
export async function toggleMemberStatusAction(formData: FormData) {
  const parsed = toggleStatusInputSchema.safeParse({
    membershipId: formData.get("membershipId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) redirect("/members");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "tenant:manage_members");

  if (parsed.data.membershipId === ctx.membership.id) redirect("/members");

  await prismaAdmin.$transaction(async (tx) => {
    const target = await tx.tenantMembership.findFirst({
      where: { id: parsed.data.membershipId, tenantId: ctx.activeTenantId },
      select: { id: true, globalRole: true, status: true },
    });
    if (!target) return;

    if (target.globalRole === "tenant_owner" && ctx.membership.globalRole !== "tenant_owner") {
      return;
    }

    if (parsed.data.intent === "disable" && target.globalRole === "tenant_owner") {
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
      data: { status: parsed.data.intent === "disable" ? "disabled" : "active" },
    });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: parsed.data.intent === "disable" ? "membership.disable" : "membership.enable",
        entityType: "tenant_membership",
        entityId: target.id,
        before: { status: target.status },
        after: { status: parsed.data.intent === "disable" ? "disabled" : "active" },
      },
    );
  });

  redirect("/members");
}
