"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function deleteChannelAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/channels");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.channel.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, tipo: true, identificador: true, nomeAmigavel: true, status: true },
    });
    if (!before) return;

    await tx.channel.delete({ where: { id: parsed.data.id } });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "channel.delete",
        entityType: "channel",
        entityId: before.id,
        before,
      },
    );
  });

  redirect("/channels");
}
