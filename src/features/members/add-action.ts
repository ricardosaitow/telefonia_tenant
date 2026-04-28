"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { addMemberInputSchema } from "./schemas";

/**
 * Adiciona membro existente (Account já cadastrada) ao tenant ativo.
 *
 * V1 — sem convite por email ainda:
 *  - Account precisa existir (alguém precisa ter feito signup antes).
 *  - Cria Membership active direto (sem fluxo de aceitar).
 *
 * Fluxo real de convite por email vem em fatia futura quando Resend integrar.
 *
 * Usa `prismaAdmin` porque busca Account (sem RLS) E cria TenantMembership
 * (com RLS, mas precisa bypass na criação por mesmas razões do signup).
 */
export async function addMemberAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: addMemberInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "tenant:manage_members");

  // Apenas owner pode CRIAR outro owner.
  if (submission.value.role === "tenant_owner" && ctx.membership.globalRole !== "tenant_owner") {
    return submission.reply({
      formErrors: ["Apenas owners podem criar outros owners."],
    });
  }

  await prismaAdmin.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { email: submission.value.email },
      select: { id: true },
    });
    if (!account) {
      return; // silently — caller verifica via reload
    }

    // Idempotente: se já tem membership, ignora.
    try {
      const created = await tx.tenantMembership.create({
        data: {
          tenantId: ctx.activeTenantId,
          accountId: account.id,
          globalRole: submission.value.role,
          status: "active",
          joinedAt: new Date(),
        },
      });
      await recordAuditInTx(
        tx,
        {
          tenantId: ctx.activeTenantId,
          accountId: ctx.account.id,
          membershipId: ctx.membership.id,
        },
        {
          action: "membership.add",
          entityType: "tenant_membership",
          entityId: created.id,
          after: {
            email: submission.value.email,
            role: submission.value.role,
          },
        },
      );
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return; // já tem membership.
      }
      throw err;
    }
  });

  // Verifica resultado pra dar feedback adequado:
  const account = await prismaAdmin.account.findUnique({
    where: { email: submission.value.email },
    select: { id: true },
  });
  if (!account) {
    return submission.reply({
      formErrors: [
        "Conta não encontrada. A pessoa precisa fazer signup primeiro com este email; depois você pode adicioná-la.",
      ],
    });
  }

  redirect("/members");
}
