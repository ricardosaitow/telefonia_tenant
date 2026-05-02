import { withTenantContext } from "@/lib/db/tenant-context";

export type QuickReplyItem = {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  departmentId: string | null;
  departmentName: string | null;
  usageCount: number;
  active: boolean;
};

/**
 * List all quick replies for the tenant, optionally filtered by department.
 */
export async function getQuickReplies(
  tenantId: string,
  opts: { departmentId?: string; activeOnly?: boolean } = {},
): Promise<QuickReplyItem[]> {
  return withTenantContext(tenantId, async (tx) => {
    const replies = await tx.quickReply.findMany({
      where: {
        ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
        ...(opts.activeOnly ? { active: true } : {}),
      },
      orderBy: [{ usageCount: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        shortcut: true,
        content: true,
        mediaUrl: true,
        mediaMimeType: true,
        departmentId: true,
        department: { select: { nome: true } },
        usageCount: true,
        active: true,
      },
    });

    return replies.map((r) => ({
      id: r.id,
      title: r.title,
      shortcut: r.shortcut,
      content: r.content,
      mediaUrl: r.mediaUrl,
      mediaMimeType: r.mediaMimeType,
      departmentId: r.departmentId,
      departmentName: r.department?.nome ?? null,
      usageCount: r.usageCount,
      active: r.active,
    }));
  });
}

/**
 * Search quick replies by shortcut prefix (for autocomplete).
 */
export async function searchQuickReplies(
  tenantId: string,
  prefix: string,
  departmentId?: string,
): Promise<QuickReplyItem[]> {
  return withTenantContext(tenantId, async (tx) => {
    const replies = await tx.quickReply.findMany({
      where: {
        active: true,
        shortcut: { startsWith: prefix },
        ...(departmentId ? { OR: [{ departmentId }, { departmentId: null }] } : {}),
      },
      orderBy: { usageCount: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        shortcut: true,
        content: true,
        mediaUrl: true,
        mediaMimeType: true,
        departmentId: true,
        department: { select: { nome: true } },
        usageCount: true,
        active: true,
      },
    });

    return replies.map((r) => ({
      id: r.id,
      title: r.title,
      shortcut: r.shortcut,
      content: r.content,
      mediaUrl: r.mediaUrl,
      mediaMimeType: r.mediaMimeType,
      departmentId: r.departmentId,
      departmentName: r.department?.nome ?? null,
      usageCount: r.usageCount,
      active: r.active,
    }));
  });
}
