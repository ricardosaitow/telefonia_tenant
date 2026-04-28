/**
 * Reads de Extension. Tenant-scoped via withTenantContext (RLS).
 */
import { withTenantContext } from "@/lib/db/tenant-context";

export type ExtensionListItem = {
  id: string;
  extension: string;
  displayName: string | null;
  enabled: boolean;
  pbxExtensionUuid: string | null;
  passwordRef: string;
  createdAt: Date;
};

export async function listExtensions(tenantId: string): Promise<ExtensionListItem[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx.extension.findMany({
      orderBy: { extension: "asc" },
      select: {
        id: true,
        extension: true,
        displayName: true,
        enabled: true,
        pbxExtensionUuid: true,
        passwordRef: true,
        createdAt: true,
      },
    });
  });
}
