"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({
  id: z.string().uuid(),
  intent: z.enum(["pause", "resume"]),
});

export async function pauseAgentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({
    id: formData.get("id"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    let count = 0;
    if (parsed.data.intent === "pause") {
      const r = await tx.agent.updateMany({
        where: { id: parsed.data.id, status: "production" },
        data: { status: "paused" },
      });
      count = r.count;
    } else {
      const r = await tx.agent.updateMany({
        where: {
          id: parsed.data.id,
          status: "paused",
          currentVersionId: { not: null },
        },
        data: { status: "production" },
      });
      count = r.count;
    }

    if (count > 0) {
      await recordAuditInTx(
        tx,
        {
          tenantId: ctx.activeTenantId,
          accountId: ctx.account.id,
          membershipId: ctx.membership.id,
        },
        {
          action: parsed.data.intent === "pause" ? "agent.pause" : "agent.resume",
          entityType: "agent",
          entityId: parsed.data.id,
        },
      );
    }
  });

  redirect(`/agents/${parsed.data.id}`);
}
