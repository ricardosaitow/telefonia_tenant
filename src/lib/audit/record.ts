import type { Prisma } from "@/generated/prisma/client";

/**
 * Helper compartilhado pra gravar AuditLog dentro de uma TX.
 *
 * Uso típico (Server Action):
 *
 *   await withTenantContext(ctx.activeTenantId, async (tx) => {
 *     const dept = await tx.department.create({ ... });
 *     await recordAuditInTx(tx, ctx, {
 *       action: "department.create",
 *       entityType: "department",
 *       entityId: dept.id,
 *       after: dept,
 *     });
 *   });
 *
 * `before`/`after` são serializados como JSON (Prisma faz). Datas viram
 * strings ISO automaticamente; campos undefined viram null.
 *
 * NÃO captura ip/userAgent ainda — chega quando AccountActivity for
 * implementado (V1.x).
 */

export type AuditEntry = {
  /** ex.: "department.create", "agent.publish" */
  action: string;
  /** ex.: "department", "agent", "agent_version" */
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export type AuditActor = {
  tenantId: string;
  accountId: string;
  membershipId?: string | null | undefined;
};

export async function recordAuditInTx(
  tx: Prisma.TransactionClient,
  actor: AuditActor,
  entry: AuditEntry,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      accountId: actor.accountId,
      membershipId: actor.membershipId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: serializeJson(entry.before),
      after: serializeJson(entry.after),
    },
  });
}

function serializeJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (v === undefined || v === null) {
    return null as unknown as typeof Prisma.JsonNull;
  }
  // Prisma aceita qualquer JSON-serializable.
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}
