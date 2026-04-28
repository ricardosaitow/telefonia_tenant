"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { channelInputSchema } from "./schemas";

export async function createChannelAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: channelInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  try {
    await withTenantContext(ctx.activeTenantId, async (tx) => {
      const channel = await tx.channel.create({
        data: {
          tenantId: ctx.activeTenantId,
          tipo: submission.value.tipo,
          identificador: submission.value.identificador,
          nomeAmigavel: submission.value.nomeAmigavel,
          // status default = "active" (workflow real vem depois).
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
          action: "channel.create",
          entityType: "channel",
          entityId: channel.id,
          after: channel,
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
        formErrors: ["Já existe um canal desse tipo com esse identificador."],
      });
    }
    throw err;
  }

  redirect("/channels");
}
