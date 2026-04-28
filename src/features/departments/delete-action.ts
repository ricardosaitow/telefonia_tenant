"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

/**
 * Delete Department. Owner/admin only.
 *
 * FK constraint Agent.department_id ON DELETE RESTRICT — se houver Agent
 * vinculado, o INSERT falha com P2003. UI deveria preview a contagem
 * antes; por ora a Server Action devolve o erro pro form (V1).
 */
export async function deleteDepartmentAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect("/departments");

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "department:manage");

  await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.department.deleteMany({ where: { id: parsed.data.id } }),
  );

  redirect("/departments");
}
