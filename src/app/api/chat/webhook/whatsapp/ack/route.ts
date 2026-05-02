/**
 * POST /api/chat/webhook/whatsapp/ack
 *
 * Receives ACK updates from wa-bridge.
 *
 * Body:
 * {
 *   messageId: string,   // wa-bridge message ID
 *   ackLevel: number,    // 0=pending, 1=sent, 2=delivered, 3=read
 * }
 */

import { NextResponse } from "next/server";

import { chatEventBus } from "@/lib/chat/event-bus";
import { prismaAdmin } from "@/lib/db/admin-client";

export const dynamic = "force-dynamic";

type AckPayload = {
  messageId: string;
  ackLevel: number;
};

export async function POST(req: Request) {
  let body: AckPayload;
  try {
    body = (await req.json()) as AckPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.messageId || typeof body.ackLevel !== "number") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Find message via prismaAdmin — webhook has no tenant context (system-to-system).
  const message = await prismaAdmin.chatMessage.findUnique({
    where: { waMessageId: body.messageId },
    select: { id: true, chatId: true, tenantId: true, ackLevel: true },
  });

  if (!message) {
    return NextResponse.json({ error: "message_not_found" }, { status: 404 });
  }

  // Only update if ackLevel is higher (don't go backwards)
  if (message.ackLevel !== null && body.ackLevel <= message.ackLevel) {
    return NextResponse.json({ ok: true });
  }

  await prismaAdmin.chatMessage.update({
    where: { id: message.id },
    data: { ackLevel: body.ackLevel },
  });

  chatEventBus.emit(message.tenantId, {
    type: "message_ack",
    chatId: message.chatId,
    waMessageId: body.messageId,
    ackLevel: body.ackLevel,
  });

  return NextResponse.json({ ok: true });
}
