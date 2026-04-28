import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Queries de Department — todas via withTenantContext (rule
 * `architecture-portal.md` "Queries com RLS"). Tabela departments tem RLS
 * por tenant_id; sem context retorna [] silencioso.
 */

export async function listDepartments(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.department.findMany({
      orderBy: [{ nome: "asc" }],
      select: {
        id: true,
        slug: true,
        nome: true,
        descricao: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  );
}

export async function getDepartmentById(activeTenantId: string, id: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.department.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        nome: true,
        descricao: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  );
}

export type DepartmentListItem = Awaited<ReturnType<typeof listDepartments>>[number];
export type DepartmentDetail = NonNullable<Awaited<ReturnType<typeof getDepartmentById>>>;
