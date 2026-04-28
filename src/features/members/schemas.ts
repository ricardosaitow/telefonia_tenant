import { z } from "zod";

export const memberRoleSchema = z.enum([
  "tenant_owner",
  "tenant_admin",
  "department_supervisor",
  "operator",
  "auditor",
]);

export const addMemberInputSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  role: memberRoleSchema,
});

export const updateRoleInputSchema = z.object({
  membershipId: z.string().uuid(),
  role: memberRoleSchema,
});

export const toggleStatusInputSchema = z.object({
  membershipId: z.string().uuid(),
  intent: z.enum(["disable", "enable"]),
});

export const ROLE_LABEL: Record<z.infer<typeof memberRoleSchema>, string> = {
  tenant_owner: "Owner",
  tenant_admin: "Admin",
  department_supervisor: "Supervisor",
  operator: "Operador",
  auditor: "Auditor",
};

export const STATUS_LABEL: Record<string, string> = {
  invited: "Convidado",
  active: "Ativo",
  disabled: "Desativado",
};
