"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { prismaAdmin } from "@/lib/db/admin-client";
import { sendEmail } from "@/lib/email/send";
import { InviteMemberEmail } from "@/lib/email/templates/invite-member";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { addMemberInputSchema, ROLE_LABEL } from "./schemas";

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Adiciona membro ao tenant ativo.
 *
 * Dual-path:
 *  - Account existe → cria membership direto (status: active)
 *  - Account não existe → cria InviteToken (7 dias), envia email
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

  // Rate limit pra convites — 10/min/account.
  const rl = await checkRateLimit({
    key: `invite:${ctx.account.id}`,
    limit: RATE_LIMITS.INVITE.limit,
    windowSec: RATE_LIMITS.INVITE.windowSec,
  });
  if (!rl.ok) {
    return submission.reply({
      formErrors: [`Muitas tentativas. Aguarde ${rl.resetSec}s.`],
    });
  }

  const { email, role } = submission.value;

  const account = await prismaAdmin.account.findUnique({
    where: { email },
    select: { id: true },
  });

  if (account) {
    // Account existe — cria membership direto.
    try {
      await prismaAdmin.$transaction(async (tx) => {
        const created = await tx.tenantMembership.create({
          data: {
            tenantId: ctx.activeTenantId,
            accountId: account.id,
            globalRole: role,
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
            after: { email, role },
          },
        );
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return submission.reply({
          formErrors: ["Esta pessoa já é membro deste tenant."],
        });
      }
      throw err;
    }
  } else {
    // Account não existe — cria InviteToken e envia email.
    const raw = generateToken();
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    const tenant = await prismaAdmin.tenant.findUniqueOrThrow({
      where: { id: ctx.activeTenantId },
      select: { nomeFantasia: true },
    });

    await prismaAdmin.inviteToken.create({
      data: {
        tenantId: ctx.activeTenantId,
        email,
        role,
        invitedById: ctx.account.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const acceptUrl = `${appUrl}/invite/${encodeURIComponent(raw)}`;

    void sendEmail({
      to: email,
      subject: `Convite para ${tenant.nomeFantasia} — telefonia.ia`,
      react: InviteMemberEmail({
        inviterName: ctx.account.name,
        tenantName: tenant.nomeFantasia,
        role: ROLE_LABEL[role] ?? role,
        acceptUrl,
      }),
      tags: [{ name: "category", value: "invite" }],
    });
  }

  redirect("/members");
}
