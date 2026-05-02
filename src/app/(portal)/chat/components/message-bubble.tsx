"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";

import type { ChatMessageItem } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: ChatMessageItem;
  isOwn: boolean;
};

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  // System messages
  if (message.tipo === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="bg-surface-2 text-muted-foreground rounded-md px-3 py-1 text-[11px]">
          {message.content}
        </span>
      </div>
    );
  }

  // Deleted messages
  if (message.deletedAt) {
    return (
      <div className={cn("flex py-0.5", isOwn ? "justify-end" : "justify-start")}>
        <div className="bg-surface-2 rounded-md px-3 py-1.5">
          <p className="text-muted-foreground text-xs italic">Mensagem apagada</p>
        </div>
      </div>
    );
  }

  const time = format(new Date(message.createdAt), "HH:mm", { locale: ptBR });

  // ACK ticks for WhatsApp
  const renderAck = () => {
    if (message.ackLevel == null || message.fromCustomer) return null;
    if (message.ackLevel >= 3) {
      return <CheckCheck className="text-accent-light size-3" />;
    }
    if (message.ackLevel >= 2) {
      return <CheckCheck className="text-muted-foreground size-3" />;
    }
    return <Check className="text-muted-foreground size-3" />;
  };

  return (
    <div className={cn("flex py-0.5", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-md px-3 py-1.5",
          isOwn
            ? "bg-primary text-primary-foreground"
            : message.fromCustomer
              ? "bg-surface-2 text-foreground"
              : "bg-card text-foreground border-border border",
        )}
      >
        {/* Sender name (group chats or staff messages) */}
        {!isOwn && message.senderName && (
          <p className="mb-0.5 text-[11px] font-medium opacity-70">{message.senderName}</p>
        )}
        {!isOwn && message.fromCustomer && message.senderName === null && (
          <p className="mb-0.5 text-[11px] font-medium opacity-70">Cliente</p>
        )}

        {/* Quoted message */}
        {message.quotedMessage && (
          <div className="border-border bg-background/20 mb-1 rounded-md border-l-2 px-2 py-1">
            {message.quotedMessage.senderName && (
              <p className="text-[10px] font-medium opacity-70">
                {message.quotedMessage.senderName}
              </p>
            )}
            <p className="truncate text-[11px] opacity-80">{message.quotedMessage.content}</p>
          </div>
        )}

        {/* Content */}
        <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>

        {/* Media (placeholder for now) */}
        {message.mediaUrl && message.mediaMimeType?.startsWith("image/") && (
          <div className="mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.mediaUrl}
              alt={message.mediaName ?? "Image"}
              className="max-h-60 rounded-md"
            />
          </div>
        )}

        {/* Footer: time + ack */}
        <div className="mt-0.5 flex items-center justify-end gap-1">
          {message.edited && <span className="text-[10px] opacity-50">editado</span>}
          <span className="text-[10px] opacity-60">{time}</span>
          {renderAck()}
        </div>
      </div>
    </div>
  );
}
