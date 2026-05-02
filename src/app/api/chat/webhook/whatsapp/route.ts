/**
 * POST /api/chat/webhook/whatsapp
 *
 * Receives inbound messages from wa-bridge.
 * No session auth — validated by channelId lookup + wa-bridge internal network.
 *
 * Body:
 * {
 *   channelId: string,
 *   messageId: string,       // wa-bridge unique ID
 *   from: string,            // WID e.g. "5511987654321@s.whatsapp.net"
 *   pushname?: string,       // Contact display name
 *   type: string,            // "text" | "image" | "audio" | etc.
 *   text?: string,           // Message body
 *   timestamp: number,       // Unix epoch seconds
 *   quotedMessageId?: string,
 *   media?: { url: string, mimeType: string, filename?: string, size?: number },
 *   location?: { latitude: number, longitude: number, name?: string },
 * }
 */

import { NextResponse } from "next/server";

import { generateProtocol } from "@/features/chat/protocol";
import { chatEventBus } from "@/lib/chat/event-bus";
import { prismaAdmin } from "@/lib/db/admin-client";
import { withTenantContext } from "@/lib/db/tenant-context";

export const dynamic = "force-dynamic";

type InboundPayload = {
  channelId: string;
  messageId: string;
  from: string;
  pushname?: string;
  type: string;
  text?: string;
  timestamp: number;
  quotedMessageId?: string;
  media?: { url: string; mimeType: string; filename?: string; size?: number };
  location?: { latitude: number; longitude: number; name?: string };
};

export async function POST(req: Request) {
  let body: InboundPayload;
  try {
    body = (await req.json()) as InboundPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.channelId || !body.messageId || !body.from) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Lookup channel via prismaAdmin — webhook has no tenant context (system-to-system).
  // Same pattern as auth flow: admin for initial lookup, then withTenantContext.
  const channel = await prismaAdmin.channel.findUnique({
    where: { id: body.channelId },
    select: { id: true, tenantId: true, tipo: true },
  });

  if (!channel || channel.tipo !== "whatsapp") {
    return NextResponse.json({ error: "channel_not_found" }, { status: 404 });
  }

  const tenantId = channel.tenantId;
  // Store the full WID (e.g. "5511987654321@s.whatsapp.net" or "123456@lid")
  // so we can send messages back using the correct identifier format.
  const customerPhone = body.from;
  const customerName = body.pushname ?? null;

  await withTenantContext(tenantId, async (tx) => {
    // Find or create chat for this customer + channel
    let chat = await tx.chat.findFirst({
      where: {
        channelId: channel.id,
        customerPhone,
        status: { not: "finished" },
      },
      select: { id: true },
    });

    if (!chat) {
      const protocol = await generateProtocol(tenantId);

      chat = await tx.chat.create({
        data: {
          tenantId,
          tipo: "whatsapp",
          channelId: channel.id,
          customerPhone,
          customerName,
          protocol,
          status: "triage",
        },
        select: { id: true },
      });

      // Emit new_chat event
      chatEventBus.emit(tenantId, {
        type: "new_chat",
        chat: {
          id: chat.id,
          tipo: "whatsapp",
          titulo: null,
          protocol,
          status: "triage",
          priority: "normal",
          customerPhone,
          customerName,
          customerAvatarUrl: null,
          pinned: false,
          archived: false,
          lastActivityAt: new Date().toISOString(),
          lastMessage: null,
          assignedTo: null,
          department: null,
          unreadCount: 0,
        },
      });
    } else if (customerName) {
      // Update customer name if changed
      await tx.chat.update({
        where: { id: chat.id },
        data: { customerName },
      });
    }

    // Deduplicate by waMessageId
    const existing = await tx.chatMessage.findUnique({
      where: { waMessageId: body.messageId },
      select: { id: true },
    });
    if (existing) return;

    // Determine message type
    const tipo = mapMessageType(body.type);

    // Find quoted message if any
    let quotedMessageId: string | null = null;
    if (body.quotedMessageId) {
      const quoted = await tx.chatMessage.findUnique({
        where: { waMessageId: body.quotedMessageId },
        select: { id: true },
      });
      quotedMessageId = quoted?.id ?? null;
    }

    const message = await tx.chatMessage.create({
      data: {
        tenantId,
        chatId: chat.id,
        content: body.text ?? "",
        tipo,
        fromCustomer: true,
        waMessageId: body.messageId,
        quotedMessageId,
        mediaUrl: body.media?.url ?? null,
        mediaName: body.media?.filename ?? null,
        mediaMimeType: body.media?.mimeType ?? null,
        mediaSize: body.media?.size ?? null,
        locationLat: body.location?.latitude ?? null,
        locationLng: body.location?.longitude ?? null,
        locationName: body.location?.name ?? null,
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
      },
    });

    // Update chat denormalized fields
    await tx.chat.update({
      where: { id: chat.id },
      data: {
        lastMessageId: message.id,
        lastActivityAt: message.createdAt,
      },
    });

    // Emit SSE
    chatEventBus.emit(tenantId, {
      type: "new_message",
      chatId: chat.id,
      message: {
        id: message.id,
        content: message.content,
        tipo: message.tipo,
        fromCustomer: true,
        waMessageId: message.waMessageId,
        ackLevel: message.ackLevel,
        edited: false,
        deletedAt: null,
        mediaUrl: message.mediaUrl,
        mediaName: message.mediaName,
        mediaMimeType: message.mediaMimeType,
        locationLat: message.locationLat,
        locationLng: message.locationLng,
        locationName: message.locationName,
        quotedMessageId: message.quotedMessageId,
        quotedMessage: null,
        senderMembershipId: null,
        senderName: null,
        createdAt: message.createdAt.toISOString(),
      },
    });
  });

  return NextResponse.json({ ok: true });
}

function mapMessageType(type: string) {
  const map: Record<string, string> = {
    text: "text",
    image: "image",
    audio: "audio",
    video: "video",
    document: "document",
    location: "location",
    contact: "contact",
    ptt: "voice_note",
    voice_note: "voice_note",
  };
  return (map[type] ?? "text") as
    | "text"
    | "image"
    | "audio"
    | "video"
    | "document"
    | "location"
    | "contact"
    | "voice_note";
}
