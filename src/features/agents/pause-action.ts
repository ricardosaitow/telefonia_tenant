"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({
  id: z.string().uuid(),
  /** "pause" → status=paused; "resume" → status=production. */
  intent: z.enum(["pause", "resume"]),
});

/**
 * Toggle pausa do Agent.
 *
 * - pause: production → paused (runtime para de usar este agente).
 * - resume: paused → production (precisa currentVersionId; se não tiver,
 *   noop; UI deveria oferecer publish).
 *
 * Owner/admin/supervisor only.
 */
export async function pauseAgentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({
    id: formData.get("id"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    if (parsed.data.intent === "pause") {
      await tx.agent.updateMany({
        where: { id: parsed.data.id, status: "production" },
        data: { status: "paused" },
      });
    } else {
      // resume só faz sentido se já tem currentVersionId.
      await tx.agent.updateMany({
        where: {
          id: parsed.data.id,
          status: "paused",
          currentVersionId: { not: null },
        },
        data: { status: "production" },
      });
    }
  });

  redirect(`/agents/${parsed.data.id}`);
}
