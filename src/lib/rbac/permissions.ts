import type { MembershipRole } from "@/generated/prisma/client";

/**
 * Matriz de permissões — alinha com Ontologia §4 (RBAC).
 *
 * Cada `Capability` lista os roles que podem executá-la. Owners e admins
 * sempre podem CRUD config; supervisor é nível de operação por departamento;
 * operator/auditor só leem.
 *
 * Role por departamento (membership_department_role) chega em V1.x — aqui
 * só global role.
 */

export type Capability =
  | "department:manage"
  | "agent:manage"
  | "knowledge:manage"
  | "channel:manage"
  | "integration:manage"
  | "tenant:manage_billing"
  | "tenant:manage_members";

const ALLOW: Record<Capability, MembershipRole[]> = {
  "department:manage": ["tenant_owner", "tenant_admin"],
  "agent:manage": ["tenant_owner", "tenant_admin", "department_supervisor"],
  "knowledge:manage": ["tenant_owner", "tenant_admin", "department_supervisor"],
  "channel:manage": ["tenant_owner", "tenant_admin"],
  "integration:manage": ["tenant_owner", "tenant_admin"],
  "tenant:manage_billing": ["tenant_owner"],
  "tenant:manage_members": ["tenant_owner", "tenant_admin"],
};

export function can(role: MembershipRole, capability: Capability): boolean {
  return ALLOW[capability]?.includes(role) ?? false;
}

export class ForbiddenError extends Error {
  constructor(public capability: Capability) {
    super(`forbidden: ${capability}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: MembershipRole, capability: Capability): void {
  if (!can(role, capability)) throw new ForbiddenError(capability);
}
