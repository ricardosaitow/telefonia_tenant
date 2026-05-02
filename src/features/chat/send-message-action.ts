"use server";

import { chatEventBus } from "@/lib/chat/event-bus";
import { clearTyping } from "@/lib/chat/typing-store";
import { waBridgeSend } from "@/lib/chat/wa-bridge-client";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { sendMessageSchema } from "./schemas";

export const sendMessageAction = actionClient
  .schema(sendMessageSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:send");

    const {
      chatId,
      content,
      tipo,
      quotedMessageId,
      mediaUrl,
      mediaName,
      mediaMimeType,
      mediaSize,
      locationLat,
      locationLng,
      locationName,
    } = parsedInput;

    // Step 1: DB operations inside transaction (fast, no external calls)
    const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: {
          id: true,
          status: true,
          tipo: true,
          customerPhone: true,
          channel: { select: { waBridgeUrl: true } },
        },
      });

      if (!chat) throw new Error("Chat não encontrado.");
      if (chat.status === "finished") throw new Error("Chat finalizado.");

      const message = await tx.chatMessage.create({
        data: {
          tenantId: ctx.activeTenantId,
          chatId,
          senderMembershipId: ctx.membership.id,
          content,
          tipo,
          quotedMessageId: quotedMessageId ?? null,
          mediaUrl: mediaUrl ?? null,
          mediaName: mediaName ?? null,
          mediaMimeType: mediaMimeType ?? null,
          mediaSize: mediaSize ?? null,
          locationLat: locationLat ?? null,
          locationLng: locationLng ?? null,
          locationName: locationName ?? null,
        },
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
          senderMembershipId: true,
          createdAt: true,
          sender: {
            select: { account: { select: { nome: true } } },
          },
          quotedMessage: {
            select: {
              content: true,
              sender: { select: { account: { select: { nome: true } } } },
            },
          },
        },
      });

      // Update chat denormalized fields
      await tx.chat.update({
        where: { id: chatId },
        data: {
          lastMessageId: message.id,
          lastActivityAt: message.createdAt,
          // If triage/waiting, move to in_service when staff sends message
          ...(chat.status === "triage" || chat.status === "waiting"
            ? { status: "in_service" }
            : {}),
        },
      });

      // Update sender's lastReadAt
      await tx.chatParticipant.updateMany({
        where: { chatId, membershipId: ctx.membership.id },
        data: { lastReadAt: message.createdAt },
      });

      return { chat, message };
    });

    const { chat, message } = result;

    // Step 2: Clear typing (in-memory, fast)
    clearTyping(ctx.activeTenantId, chatId, ctx.membership.id);

    // Step 3: Send via wa-bridge OUTSIDE the transaction
    let waMessageId: string | null = null;
    if (chat.tipo === "whatsapp" && chat.channel?.waBridgeUrl && chat.customerPhone) {
      try {
        const waResult = await waBridgeSend(chat.channel.waBridgeUrl, {
          to: chat.customerPhone,
          text: content,
          ...(mediaUrl && mediaMimeType
            ? {
                media: { url: mediaUrl, mimeType: mediaMimeType, filename: mediaName ?? undefined },
              }
            : {}),
        });
        waMessageId = waResult.messageId;

        // Update message with wa-bridge ID (separate query, outside tx)
        await withTenantContext(ctx.activeTenantId, (tx) =>
          tx.chatMessage.update({
            where: { id: message.id },
            data: { waMessageId, ackLevel: 0 },
          }),
        );
      } catch (err) {
        console.error("[chat] wa-bridge send failed:", err instanceof Error ? err.message : err);
      }
    }

    // Step 4: Emit SSE event
    chatEventBus.emit(ctx.activeTenantId, {
      type: "new_message",
      chatId,
      message: {
        id: message.id,
        content: message.content,
        tipo: message.tipo,
        fromCustomer: message.fromCustomer,
        waMessageId: waMessageId ?? message.waMessageId,
        ackLevel: waMessageId ? 0 : message.ackLevel,
        edited: message.edited,
        deletedAt: message.deletedAt?.toISOString() ?? null,
        mediaUrl: message.mediaUrl,
        mediaName: message.mediaName,
        mediaMimeType: message.mediaMimeType,
        locationLat: message.locationLat,
        locationLng: message.locationLng,
        locationName: message.locationName,
        quotedMessageId: message.quotedMessageId,
        quotedMessage: message.quotedMessage
          ? {
              content: message.quotedMessage.content,
              senderName: message.quotedMessage.sender?.account.nome ?? null,
            }
          : null,
        senderMembershipId: message.senderMembershipId,
        senderName: message.sender?.account.nome ?? null,
        createdAt: message.createdAt.toISOString(),
      },
    });

    return { ok: true, messageId: message.id };
  });
