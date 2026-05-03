"use client";

import { CheckCircle, Info, RotateCcw, UserPlus } from "lucide-react";
import { useCallback, useEffect, useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { assignChatAction } from "@/features/chat/assign-action";
import { finishChatAction } from "@/features/chat/finish-action";
import { reopenChatAction } from "@/features/chat/reopen-action";
import { sendMessageAction } from "@/features/chat/send-message-action";
import {
  type ChatDetailData,
  type ChatMessageItem,
  formatPhoneForDisplay,
} from "@/features/chat/types";
import { typingAction } from "@/features/chat/typing-action";

import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";

type ChatDetailProps = {
  chat: ChatDetailData;
  messages: ChatMessageItem[];
  currentMembershipId: string;
  currentAccountName: string;
  typingUsers: string[];
  onMessageSent: (message: ChatMessageItem) => void;
  onToggleInfo: () => void;
};

export function ChatDetail({
  chat,
  messages,
  currentMembershipId,
  currentAccountName,
  typingUsers,
  onMessageSent,
  onToggleInfo,
}: ChatDetailProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sending, startSend] = useTransition();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(
    (content: string) => {
      startSend(async () => {
        const result = await sendMessageAction({
          chatId: chat.id,
          content,
        });

        if (result?.data?.ok && result.data.messageId) {
          const newMessage: ChatMessageItem = {
            id: result.data.messageId,
            content,
            tipo: "text",
            fromCustomer: false,
            waMessageId: null,
            ackLevel: null,
            edited: false,
            deletedAt: null,
            mediaUrl: null,
            mediaName: null,
            mediaMimeType: null,
            locationLat: null,
            locationLng: null,
            locationName: null,
            quotedMessageId: null,
            quotedMessage: null,
            senderMembershipId: currentMembershipId,
            senderName: currentAccountName,
            createdAt: new Date().toISOString(),
          };
          onMessageSent(newMessage);
        }
      });
    },
    [chat.id, currentMembershipId, currentAccountName, onMessageSent],
  );

  const handleTyping = useCallback(() => {
    void typingAction({ chatId: chat.id });
  }, [chat.id]);

  const handleAssignSelf = useCallback(() => {
    void assignChatAction({ chatId: chat.id, assignedToId: currentMembershipId });
  }, [chat.id, currentMembershipId]);

  const handleFinish = useCallback(() => {
    void finishChatAction({ chatId: chat.id });
  }, [chat.id]);

  const handleReopen = useCallback(() => {
    void reopenChatAction({ chatId: chat.id });
  }, [chat.id]);

  const isFinished = chat.status === "finished";
  const isAssigned = !!chat.assignedTo;
  const isAssignedToMe = chat.assignedTo?.id === currentMembershipId;

  const displayTitle =
    chat.titulo ??
    chat.customerName ??
    formatPhoneForDisplay(chat.customerPhone) ??
    chat.protocol ??
    "Chat";

  const statusLabel: Record<string, string> = {
    triage: "Triagem",
    waiting: "Aguardando",
    in_service: "Em atendimento",
    finished: "Finalizado",
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat header */}
      <div className="border-divider-strong flex items-center gap-3 border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground truncate text-sm font-medium">{displayTitle}</h2>
          <p className="text-muted-foreground text-xs">
            {statusLabel[chat.status] ?? chat.status}
            {chat.department ? ` · ${chat.department.nome}` : ""}
            {chat.assignedTo ? ` · ${chat.assignedTo.accountName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Self-assign */}
          {!isFinished && !isAssignedToMe && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAssignSelf}
              title={isAssigned ? "Reatribuir para mim" : "Assumir chat"}
            >
              <UserPlus className="size-4" />
            </Button>
          )}
          {/* Finish */}
          {!isFinished && (
            <Button variant="ghost" size="sm" onClick={handleFinish} title="Finalizar chat">
              <CheckCircle className="size-4" />
            </Button>
          )}
          {/* Reopen */}
          {isFinished && (
            <Button variant="ghost" size="sm" onClick={handleReopen} title="Reabrir chat">
              <RotateCcw className="size-4" />
            </Button>
          )}
          {/* Info panel */}
          <Button variant="ghost" size="sm" onClick={onToggleInfo}>
            <Info className="size-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex min-h-full flex-col justify-end gap-1">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderMembershipId === currentMembershipId}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        {typingUsers.length > 0 && <TypingIndicator names={typingUsers} />}
      </div>

      {/* Input */}
      {chat.status !== "finished" && (
        <MessageInput onSend={handleSend} onTyping={handleTyping} disabled={sending} />
      )}
    </div>
  );
}
