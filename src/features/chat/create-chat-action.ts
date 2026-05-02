"use server";

import { chatEventBus } from "@/lib/chat/event-bus";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { createInternalChatSchema } from "./schemas";

/**
 * Create an internal chat (1:1 or group). Creator is automatically
 * added as admin participant.
 */
export const createChatAction = actionClient
  .schema(createInternalChatSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:send");

    const { titulo, participantIds } = parsedInput;

    // Ensure creator is included
    const allParticipantIds = [...new Set([ctx.membership.id, ...participantIds])];

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      // Validate all membership IDs belong to this tenant
      const memberships = await tx.tenantMembership.findMany({
        where: { id: { in: allParticipantIds }, status: "active" },
        select: { id: true, account: { select: { nome: true } } },
      });

      if (memberships.length !== allParticipantIds.length) {
        throw new Error("Um ou mais participantes não encontrados.");
      }

      // Auto-generate title for 1:1 chats (will be null, client shows other person's name)
      const isGroup = allParticipantIds.length > 2;
      const chatTitulo = isGroup ? (titulo ?? "Grupo") : null;

      const chat = await tx.chat.create({
        data: {
          tenantId: ctx.activeTenantId,
          tipo: "internal",
          titulo: chatTitulo,
          status: "in_service",
          participants: {
            createMany: {
              data: allParticipantIds.map((mid) => ({
                tenantId: ctx.activeTenantId,
                membershipId: mid,
                isAdmin: mid === ctx.membership.id,
              })),
            },
          },
        },
        select: {
          id: true,
          tipo: true,
          titulo: true,
          protocol: true,
          status: true,
          priority: true,
          lastActivityAt: true,
          pinned: true,
          archived: true,
          customerPhone: true,
          customerName: true,
          customerAvatarUrl: true,
        },
      });

      // Emit SSE event for all participants
      chatEventBus.emit(ctx.activeTenantId, {
        type: "new_chat",
        chat: {
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
          lastMessage: null,
          assignedTo: null,
          department: null,
          unreadCount: 0,
        },
      });

      return { ok: true, chatId: chat.id };
    });
  });
