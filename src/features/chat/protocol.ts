import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Generate a protocol number for WhatsApp chats.
 *
 * Format: YYYYMM-NNN (e.g., "202605-001", "202605-042")
 *
 * Sequence is per-tenant per month, auto-incremented via counting
 * existing protocols in the same month.
 */
export async function generateProtocol(tenantId: string): Promise<string> {
  const now = new Date();
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  return withTenantContext(tenantId, async (tx) => {
    const count = await tx.chat.count({
      where: {
        protocol: { startsWith: prefix },
      },
    });

    const seq = String(count + 1).padStart(3, "0");
    return `${prefix}-${seq}`;
  });
}
