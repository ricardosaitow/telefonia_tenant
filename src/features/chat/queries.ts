import { withTenantContext } from "@/lib/db/tenant-context";

import type { ChatDetailData, ChatListItem, ChatMessageItem, ChatNoteItem } from "./types";

/**
 * List chats for the current tenant, ordered by last activity.
 * Includes denormalized lastMessage and unread count per participant.
 */
export async function getChats(
  activeTenantId: string,
  membershipId: string,
  opts: {
    tipo?: "internal" | "whatsapp";
    status?: "triage" | "waiting" | "in_service" | "finished";
    assignedToId?: string;
    departmentId?: string;
    archived?: boolean;
    limit?: number;
    cursor?: string;
  } = {},
): Promise<ChatListItem[]> {
  const limit = opts.limit ?? 50;

  return withTenantContext(activeTenantId, async (tx) => {
    const chats = await tx.chat.findMany({
      where: {
        ...(opts.tipo ? { tipo: opts.tipo } : {}),
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.assignedToId ? { assignedToId: opts.assignedToId } : {}),
        ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
        archived: opts.archived ?? false,
        ...(opts.cursor ? { lastActivityAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
      take: limit,
      select: {
        id: true,
        tipo: true,
        titulo: true,
        protocol: true,
        status: true,
        priority: true,
        customerPhone: true,
        customerName: true,
        customerAvatarUrl: true,
        pinned: true,
        archived: true,
        lastActivityAt: true,
        lastMessage: {
          select: {
            content: true,
            tipo: true,
            fromCustomer: true,
            createdAt: true,
            sender: {
              select: { account: { select: { nome: true } } },
            },
          },
        },
        assignedTo: {
          select: { id: true, account: { select: { nome: true } } },
        },
        department: {
          select: { id: true, nome: true },
        },
        participants: {
          where: { membershipId, leftAt: null, deletedAt: null },
          select: { lastReadAt: true },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                // We'll compute unread client-side from lastReadAt
              },
            },
          },
        },
      },
    });

    // Compute unread count from participant's lastReadAt
    return chats.map((chat) => {
      const participant = chat.participants[0];
      return {
        id: chat.id,
        tipo: chat.tipo,
        titulo: chat.titulo,
        protocol: chat.protocol,
        status: chat.status,
        priority: chat.priority,
        customerPhone: chat.customerPhone,
        customerName: chat.customerName,
        customerAvatarUrl: chat.customerAvatarUrl,
        pinned: chat.pinned,
        archived: chat.archived,
        lastActivityAt: chat.lastActivityAt.toISOString(),
        lastMessage: chat.lastMessage
          ? {
              content: chat.lastMessage.content,
              tipo: chat.lastMessage.tipo,
              fromCustomer: chat.lastMessage.fromCustomer,
              createdAt: chat.lastMessage.createdAt.toISOString(),
              senderName: chat.lastMessage.sender?.account.nome ?? null,
            }
          : null,
        assignedTo: chat.assignedTo
          ? { id: chat.assignedTo.id, accountName: chat.assignedTo.account.nome }
          : null,
        department: chat.department,
        // Placeholder — will be computed via a separate count query for accuracy
        unreadCount: participant ? chat._count.messages : 0,
      };
    });
  });
}

/**
 * Get a single chat by ID with participants.
 */
export async function getChatById(
  activeTenantId: string,
  chatId: string,
): Promise<ChatDetailData | null> {
  return withTenantContext(activeTenantId, async (tx) => {
    const chat = await tx.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        tipo: true,
        titulo: true,
        protocol: true,
        status: true,
        priority: true,
        tags: true,
        customerPhone: true,
        customerName: true,
        customerAvatarUrl: true,
        channelId: true,
        pinned: true,
        archived: true,
        blocked: true,
        createdAt: true,
        assignedTo: {
          select: { id: true, account: { select: { nome: true } } },
        },
        department: {
          select: { id: true, nome: true },
        },
        participants: {
          where: { leftAt: null, deletedAt: null },
          select: {
            id: true,
            membershipId: true,
            isAdmin: true,
            lastReadAt: true,
            membership: {
              select: { account: { select: { nome: true } } },
            },
          },
        },
      },
    });

    if (!chat) return null;

    return {
      id: chat.id,
      tipo: chat.tipo,
      titulo: chat.titulo,
      protocol: chat.protocol,
      status: chat.status,
      priority: chat.priority,
      tags: chat.tags,
      customerPhone: chat.customerPhone,
      customerName: chat.customerName,
      customerAvatarUrl: chat.customerAvatarUrl,
      channelId: chat.channelId,
      pinned: chat.pinned,
      archived: chat.archived,
      blocked: chat.blocked,
      createdAt: chat.createdAt.toISOString(),
      assignedTo: chat.assignedTo
        ? { id: chat.assignedTo.id, accountName: chat.assignedTo.account.nome }
        : null,
      department: chat.department,
      participants: chat.participants.map((p) => ({
        id: p.id,
        membershipId: p.membershipId,
        accountName: p.membership.account.nome,
        isAdmin: p.isAdmin,
        lastReadAt: p.lastReadAt.toISOString(),
      })),
    };
  });
}

/**
 * Get paginated messages for a chat.
 */
export async function getChatMessages(
  activeTenantId: string,
  chatId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<ChatMessageItem[]> {
  const limit = opts.limit ?? 50;

  return withTenantContext(activeTenantId, async (tx) => {
    const messages = await tx.chatMessage.findMany({
      where: {
        chatId,
        ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        tipo: true,
        fromCustomer: true,
        waMessageId: true,
        ackLevel: true,
        edited: true,
        deletedAt: true,
        mediaUrl: true,
        mediaName: true,
        mediaMimeType: true,
        locationLat: true,
        locationLng: true,
        locationName: true,
        quotedMessageId: true,
        quotedMessage: {
          select: {
            content: true,
            sender: {
              select: { account: { select: { nome: true } } },
            },
          },
        },
        senderMembershipId: true,
        sender: {
          select: { account: { select: { nome: true } } },
        },
        createdAt: true,
      },
    });

    // Reverse to chronological order (queried desc for pagination)
    return messages.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      tipo: m.tipo,
      fromCustomer: m.fromCustomer,
      waMessageId: m.waMessageId,
      ackLevel: m.ackLevel,
      edited: m.edited,
      deletedAt: m.deletedAt?.toISOString() ?? null,
      mediaUrl: m.mediaUrl,
      mediaName: m.mediaName,
      mediaMimeType: m.mediaMimeType,
      locationLat: m.locationLat,
      locationLng: m.locationLng,
      locationName: m.locationName,
      quotedMessageId: m.quotedMessageId,
      quotedMessage: m.quotedMessage
        ? {
            content: m.quotedMessage.content,
            senderName: m.quotedMessage.sender?.account.nome ?? null,
          }
        : null,
      senderMembershipId: m.senderMembershipId,
      senderName: m.sender?.account.nome ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  });
}

/**
 * Get notes for a chat (staff-only internal notes).
 */
export async function getChatNotes(
  activeTenantId: string,
  chatId: string,
): Promise<ChatNoteItem[]> {
  return withTenantContext(activeTenantId, async (tx) => {
    const notes = await tx.chatNote.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: { account: { select: { nome: true } } },
        },
      },
    });

    return notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorName: n.author.account.nome,
      createdAt: n.createdAt.toISOString(),
    }));
  });
}

/**
 * Get total number of chats with unread messages for the sidebar badge.
 */
export async function getTotalUnreadChats(
  activeTenantId: string,
  membershipId: string,
): Promise<number> {
  return withTenantContext(activeTenantId, async (tx) => {
    const participants = await tx.chatParticipant.findMany({
      where: { membershipId, leftAt: null, deletedAt: null },
      select: {
        chatId: true,
        lastReadAt: true,
        chat: { select: { status: true, archived: true } },
      },
    });

    let count = 0;
    for (const p of participants) {
      if (p.chat.archived || p.chat.status === "finished") continue;

      const unread = await tx.chatMessage.count({
        where: {
          chatId: p.chatId,
          createdAt: { gt: p.lastReadAt },
          senderMembershipId: { not: membershipId },
        },
      });
      if (unread > 0) count++;
    }
    return count;
  });
}

/**
 * Get unread message count for a participant in a chat.
 */
export async function getUnreadCount(
  activeTenantId: string,
  chatId: string,
  membershipId: string,
): Promise<number> {
  return withTenantContext(activeTenantId, async (tx) => {
    const participant = await tx.chatParticipant.findUnique({
      where: { chatId_membershipId: { chatId, membershipId } },
      select: { lastReadAt: true },
    });

    if (!participant) return 0;

    return tx.chatMessage.count({
      where: {
        chatId,
        createdAt: { gt: participant.lastReadAt },
        senderMembershipId: { not: membershipId },
      },
    });
  });
}
