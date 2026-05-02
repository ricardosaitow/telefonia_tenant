"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { hashToken } from "@/lib/auth/tokens";
import { prismaAdmin } from "@/lib/db/admin-client";
import { recordSecurityEvent } from "@/lib/security/event";

/**
 * Aceita convite e cria TenantMembership.
 *
 * Três cenários:
 *  1. Logado + email match → cria membership, redirect /tenants
 *  2. Não logado + account existe → redirect /login?next=/invite/{token}
 *  3. Não logado + account não existe → redirect /signup?next=/invite/{token}
 */
export async function acceptInviteAction(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const invite = await prismaAdmin.inviteToken.findFirst({
    where: { tokenHash },
    include: {
      tenant: { select: { nomeFantasia: true } },
    },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { error: "Convite expirado ou inválido." };
  }

  const session = await auth();

  if (!session?.user?.id) {
    // Não logado — verifica se account existe pra decidir login vs signup.
    const account = await prismaAdmin.account.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });

    const next = `/invite/${encodeURIComponent(rawToken)}`;
    if (account) {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    } else {
      redirect(`/signup?next=${encodeURIComponent(next)}`);
    }
  }

  // Logado — verifica email match.
  if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      error: `Este convite foi enviado para ${invite.email}. Faça login com esse email para aceitar.`,
    };
  }

  // Cria membership + marca token aceito.
  try {
    await prismaAdmin.$transaction(async (tx) => {
      await tx.tenantMembership.create({
        data: {
          tenantId: invite.tenantId,
          accountId: session.user.id,
          globalRole: invite.role,
          status: "active",
          joinedAt: new Date(),
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      // Já é membro — marca token como aceito e segue.
      await prismaAdmin.inviteToken.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    } else {
      void recordSecurityEvent({
        severity: "medium",
        category: "authn",
        eventType: "invite_accept_failed",
        accountId: session.user.id,
        metadata: { email: invite.email, tenantId: invite.tenantId },
      });
      throw err;
    }
  }

  redirect("/tenants");
}
