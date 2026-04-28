"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { updateChannelInputSchema } from "./schemas";

export async function updateChannelAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: updateChannelInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  try {
    const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
      const before = await tx.channel.findUnique({
        where: { id: submission.value.id },
        select: { id: true, tipo: true, identificador: true, nomeAmigavel: true, status: true },
      });
      if (!before) return { count: 0 };

      const after = await tx.channel.update({
        where: { id: submission.value.id },
        data: {
          tipo: submission.value.tipo,
          identificador: submission.value.identificador,
          nomeAmigavel: submission.value.nomeAmigavel,
        },
        select: { id: true, tipo: true, identificador: true, nomeAmigavel: true, status: true },
      });

      await recordAuditInTx(
        tx,
        {
          tenantId: ctx.activeTenantId,
          accountId: ctx.account.id,
          membershipId: ctx.membership.id,
        },
        {
          action: "channel.update",
          entityType: "channel",
          entityId: after.id,
          before,
          after,
        },
      );

      return { count: 1 };
    });

    if (result.count === 0) {
      return submission.reply({ formErrors: ["Canal não encontrado."] });
    }
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return submission.reply({
        formErrors: ["Já existe um canal desse tipo com esse identificador."],
      });
    }
    throw err;
  }

  redirect("/channels");
}
