"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function toggleChannelStatusAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const channel = await tx.channel.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, status: true },
    });

    if (!channel || (channel.status !== "active" && channel.status !== "disabled")) {
      return;
    }

    const newStatus = channel.status === "active" ? "disabled" : "active";

    await tx.channel.update({
      where: { id: channel.id },
      data: { status: newStatus },
    });

    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "channel.toggle_status",
        entityType: "channel",
        entityId: channel.id,
        before: { status: channel.status },
        after: { status: newStatus },
      },
    );
  });

  revalidatePath("/channels");
  revalidatePath(`/channels/${parsed.data.id}`);
}
