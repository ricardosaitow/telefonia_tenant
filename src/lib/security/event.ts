import type { Prisma, SecurityCategory, SecuritySeverity } from "@/generated/prisma/client";
import { prismaAdmin } from "@/lib/db/admin-client";

/**
 * SecurityEvent helper (Ontologia §21, seguranca.md §5.7).
 *
 * Diferença de AuditLog: SecurityEvent registra SINAIS A INVESTIGAR
 * (login fail, lockout, MFA fail, permissão negada). AuditLog registra
 * AÇÕES PRIVILEGIADAS LEGÍTIMAS.
 *
 * tenant_id é nullable: eventos pré-tenant (login fail antes de selecionar
 * tenant, signup global) ficam null. Visíveis só pra admin via prismaAdmin
 * (RLS filtra esses pra app_user normal).
 *
 * Severity >= medium deve disparar alert via runbook (não implementado V1).
 */

export type SecurityEventInput = {
  severity: SecuritySeverity;
  category: SecurityCategory;
  /** ex.: "login_fail", "lockout_triggered", "permission_denied" */
  eventType: string;
  description?: string | undefined;
  /** Null pra eventos pré-tenant. */
  tenantId?: string | null | undefined;
  accountId?: string | null | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  linkedAuditLogId?: string | undefined;
};

/**
 * Versão "fire and forget" — usa prismaAdmin (sem RLS context). Apropriada
 * pra fluxos auth pré-tenant (login fail, signup global). Não bloqueia o
 * caller se falhar — loga e segue.
 */
export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    await prismaAdmin.securityEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        accountId: input.accountId ?? null,
        severity: input.severity,
        category: input.category,
        eventType: input.eventType,
        description: input.description ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: serializeMetadata(input.metadata),
        linkedAuditLogId: input.linkedAuditLogId ?? null,
      },
    });
  } catch (err) {
    // Falha ao gravar SecurityEvent é grave (perda de sinal de segurança),
    // mas NUNCA pode quebrar o fluxo principal. Loga e segue.
    console.error("[security] failed to record event:", err);
  }
}

/**
 * Versão transacional — usa tx existente, atômico com outras escritas.
 * Apropriada quando o evento é consequência direta de uma ação em
 * andamento (signup_success dentro da TX que cria Account/Tenant).
 */
export async function recordSecurityEventInTx(
  tx: Prisma.TransactionClient,
  input: SecurityEventInput,
): Promise<void> {
  await tx.securityEvent.create({
    data: {
      tenantId: input.tenantId ?? null,
      accountId: input.accountId ?? null,
      severity: input.severity,
      category: input.category,
      eventType: input.eventType,
      description: input.description ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: serializeMetadata(input.metadata),
      linkedAuditLogId: input.linkedAuditLogId ?? null,
    },
  });
}

function serializeMetadata(
  v: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!v) return null as unknown as typeof Prisma.JsonNull;
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}
