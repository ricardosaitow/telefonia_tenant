"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const addSchema = z.object({
  agentId: z.string().uuid(),
  toolKey: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "use só letras minúsculas, números e _"),
});

const idSchema = z.object({
  agentId: z.string().uuid(),
  id: z.string().uuid(),
});

const toggleSchema = idSchema.extend({
  enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
});

/**
 * V1: toolKey é string livre. Validação contra catálogo Pekiart
 * (consultar_produto, transferir_humano, etc) chega quando o catálogo
 * for codificado.
 */
export async function addAgentToolAction(formData: FormData) {
  const parsed = addSchema.safeParse({
    agentId: formData.get("agentId"),
    toolKey: formData.get("toolKey"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    try {
      const created = await tx.agentTool.create({
        data: {
          tenantId: ctx.activeTenantId,
          agentId: parsed.data.agentId,
          toolKey: parsed.data.toolKey,
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
          action: "agent_tool.add",
          entityType: "agent_tool",
          entityId: created.id,
          after: { agentId: parsed.data.agentId, toolKey: parsed.data.toolKey },
        },
      );
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return; // tool já habilitada nesse agent.
      }
      throw err;
    }
  });

  redirect(`/agents/${parsed.data.agentId}`);
}

export async function removeAgentToolAction(formData: FormData) {
  const parsed = idSchema.safeParse({
    agentId: formData.get("agentId"),
    id: formData.get("id"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    const before = await tx.agentTool.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, toolKey: true, agentId: true },
    });
    if (!before) return;

    await tx.agentTool.delete({ where: { id: parsed.data.id } });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "agent_tool.remove",
        entityType: "agent_tool",
        entityId: before.id,
        before,
      },
    );
  });

  redirect(`/agents/${parsed.data.agentId}`);
}

export async function toggleAgentToolAction(formData: FormData) {
  const parsed = toggleSchema.safeParse({
    agentId: formData.get("agentId"),
    id: formData.get("id"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) redirect("/agents");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "agent:manage");

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    await tx.agentTool.updateMany({
      where: { id: parsed.data.id },
      data: { enabled: parsed.data.enabled },
    });
    await recordAuditInTx(
      tx,
      {
        tenantId: ctx.activeTenantId,
        accountId: ctx.account.id,
        membershipId: ctx.membership.id,
      },
      {
        action: "agent_tool.toggle",
        entityType: "agent_tool",
        entityId: parsed.data.id,
        after: { enabled: parsed.data.enabled },
      },
    );
  });

  redirect(`/agents/${parsed.data.agentId}`);
}
