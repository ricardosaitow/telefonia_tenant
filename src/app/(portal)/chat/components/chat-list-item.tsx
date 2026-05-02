"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Phone, Pin } from "lucide-react";

import { type ChatListItem, formatPhoneForDisplay } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type ChatListItemProps = {
  chat: ChatListItem;
  isSelected: boolean;
  onSelect: () => void;
};

const statusColors: Record<string, string> = {
  triage: "bg-warning",
  waiting: "bg-accent-light",
  in_service: "bg-primary",
  finished: "bg-muted-foreground",
};

export function ChatListItem({ chat, isSelected, onSelect }: ChatListItemProps) {
  const displayName =
    chat.titulo ??
    chat.customerName ??
    formatPhoneForDisplay(chat.customerPhone) ??
    chat.protocol ??
    "Chat";

  const lastMessagePreview = chat.lastMessage
    ? chat.lastMessage.tipo === "system"
      ? chat.lastMessage.content
      : chat.lastMessage.senderName
        ? `${chat.lastMessage.senderName}: ${chat.lastMessage.content}`
        : chat.lastMessage.content
    : "Sem mensagens";

  const timeAgo = formatDistanceToNow(new Date(chat.lastActivityAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-3 border-b px-3 py-2.5 text-left transition-colors",
          "border-divider-strong",
          isSelected ? "bg-glass-bg" : "hover:bg-glass-bg/50",
        )}
      >
        {/* Status dot + icon */}
        <div className="relative mt-0.5 shrink-0">
          <div className="bg-surface-2 flex size-10 items-center justify-center rounded-md">
            {chat.tipo === "whatsapp" ? (
              <Phone className="text-muted-foreground size-4" />
            ) : (
              <MessageSquare className="text-muted-foreground size-4" />
            )}
          </div>
          <div
            className={cn(
              "border-background absolute -right-0.5 -bottom-0.5 size-2.5 rounded-md border-2",
              statusColors[chat.status] ?? "bg-muted-foreground",
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground truncate text-sm font-medium">{displayName}</span>
            {chat.pinned && <Pin className="text-muted-foreground size-3 shrink-0" />}
            <span className="text-muted-foreground ml-auto shrink-0 text-xs">{timeAgo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-xs">{lastMessagePreview}</p>
            {chat.unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] leading-none font-medium">
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </span>
            )}
          </div>
          {chat.department && (
            <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
              {chat.department.nome}
              {chat.assignedTo ? ` · ${chat.assignedTo.accountName}` : ""}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
