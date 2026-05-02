import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * List email channels for the active tenant.
 */
export async function getEmailChannels(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.channel.findMany({
      where: { tipo: "email", status: "active" },
      orderBy: { nomeAmigavel: "asc" },
      select: {
        id: true,
        identificador: true,
        nomeAmigavel: true,
      },
    }),
  );
}

/**
 * List folders for an email channel with counts.
 */
export async function getEmailFolders(activeTenantId: string, channelId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.emailFolder.findMany({
      where: { channelId },
      orderBy: { ordem: "asc" },
      select: {
        id: true,
        tipo: true,
        nome: true,
        totalEmails: true,
        unreadEmails: true,
      },
    }),
  );
}

/**
 * List emails in a folder, paginated.
 */
export async function getEmails(
  activeTenantId: string,
  channelId: string,
  folderId: string,
  opts?: { search?: string; page?: number; pageSize?: number },
) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  return withTenantContext(activeTenantId, async (tx) => {
    const where = {
      channelId,
      folderId,
      ...(opts?.search
        ? {
            OR: [
              { subject: { contains: opts.search, mode: "insensitive" as const } },
              { fromAddress: { contains: opts.search, mode: "insensitive" as const } },
              { preview: { contains: opts.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [emails, total] = await Promise.all([
      tx.emailMessage.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          fromAddress: true,
          fromName: true,
          subject: true,
          preview: true,
          sentAt: true,
          receivedAt: true,
          isRead: true,
          isImportant: true,
          isDraft: true,
        },
      }),
      tx.emailMessage.count({ where }),
    ]);

    return { emails, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });
}

/**
 * Get full email by ID (with attachments).
 */
export async function getEmailById(activeTenantId: string, id: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.emailMessage.findUnique({
      where: { id },
      select: {
        id: true,
        channelId: true,
        folderId: true,
        messageId: true,
        uid: true,
        fromAddress: true,
        fromName: true,
        toAddresses: true,
        ccAddresses: true,
        subject: true,
        bodyText: true,
        bodyHtml: true,
        preview: true,
        sentAt: true,
        receivedAt: true,
        isRead: true,
        isImportant: true,
        isDraft: true,
        inReplyTo: true,
        references: true,
        sizeBytes: true,
        attachments: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            isInline: true,
          },
        },
      },
    }),
  );
}

export type EmailChannelItem = Awaited<ReturnType<typeof getEmailChannels>>[number];
export type EmailFolderItem = Awaited<ReturnType<typeof getEmailFolders>>[number];
export type EmailListResult = Awaited<ReturnType<typeof getEmails>>;
export type EmailDetail = NonNullable<Awaited<ReturnType<typeof getEmailById>>>;
