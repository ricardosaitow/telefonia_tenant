"use client";

import { ArrowLeft, MessageCircle, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { loadChatAction, loadChatsAction } from "@/features/chat/load-chat-action";
import { markReadAction } from "@/features/chat/mark-read-action";
import type {
  ChatDetailData,
  ChatEvent,
  ChatListItem,
  ChatMessageItem,
  ChatNoteItem,
} from "@/features/chat/types";

import { ChatDetail } from "./chat-detail";
import { ChatList } from "./chat-list";
import { ChatSidebarInfo } from "./chat-sidebar-info";
import { CreateChatDialog } from "./create-chat-dialog";

/** Play a short notification beep via Web Audio API. */
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available (e.g. no user gesture yet)
  }
}

/** Show a browser notification for an incoming message. */
function showMessageNotification(senderName: string | null, content: string, chatId: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title = senderName ?? "Nova mensagem";
  const body = content.length > 80 ? `${content.slice(0, 80)}…` : content;

  const notification = new Notification(title, {
    body,
    icon: "/brand/logo.webp",
    tag: `chat-${chatId}`,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

type ChatShellProps = {
  initialChats: ChatListItem[];
  currentMembershipId: string;
  currentAccountName: string;
  initialSelectedChatId?: string;
  initialChatDetail?: ChatDetailData;
  initialMessages?: ChatMessageItem[];
};

export function ChatShell({
  initialChats,
  currentMembershipId,
  currentAccountName,
  initialSelectedChatId,
  initialChatDetail,
  initialMessages,
}: ChatShellProps) {
  const [chats, setChats] = useState<ChatListItem[]>(initialChats);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialSelectedChatId ?? null,
  );
  const [chatDetail, setChatDetail] = useState<ChatDetailData | null>(initialChatDetail ?? null);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages ?? []);
  const [notes, setNotes] = useState<ChatNoteItem[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  // Refs for SSE handler to always see latest state without re-subscribing
  const selectedChatIdRef = useRef(selectedChatId);
  const chatDetailRef = useRef(chatDetail);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    chatDetailRef.current = chatDetail;
  }, [chatDetail]);

  const reloadChats = useCallback(async () => {
    const result = await loadChatsAction();
    if (result?.data?.chats) {
      setChats(result.data.chats);
    }
  }, []);

  // SSE connection — uses refs to avoid stale closures
  useEffect(() => {
    const es = new EventSource("/api/chat/events");

    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as ChatEvent;
        handleSSEEvent(event);
      } catch {
        // Ignore parse errors (heartbeat etc)
      }
    };

    function handleSSEEvent(event: ChatEvent) {
      const currentChatId = selectedChatIdRef.current;
      const currentDetail = chatDetailRef.current;

      switch (event.type) {
        case "new_message": {
          if (event.chatId === currentChatId) {
            // Deduplicate: skip if message already exists (optimistic add from own send)
            setMessages((prev) =>
              prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message],
            );
          }
          setChats((prev) =>
            prev.map((c) =>
              c.id === event.chatId
                ? {
                    ...c,
                    lastMessage: {
                      content: event.message.content,
                      tipo: event.message.tipo,
                      fromCustomer: event.message.fromCustomer,
                      createdAt: event.message.createdAt,
                      senderName: event.message.senderName,
                    },
                    lastActivityAt: event.message.createdAt,
                    unreadCount: event.chatId === currentChatId ? c.unreadCount : c.unreadCount + 1,
                  }
                : c,
            ),
          );

          // Notify if message is not from current user and not on the active chat
          const isOwnMessage = event.message.senderMembershipId === currentMembershipId;
          if (!isOwnMessage && event.chatId !== currentChatId) {
            playNotificationSound();
            showMessageNotification(event.message.senderName, event.message.content, event.chatId);
          }
          break;
        }
        case "new_chat": {
          setChats((prev) => [event.chat, ...prev]);
          break;
        }
        case "chat_updated": {
          void reloadChats();
          if (event.chatId === currentChatId) {
            void loadChatAction({ chatId: event.chatId }).then((result) => {
              if (result?.data?.detail) setChatDetail(result.data.detail);
            });
          }
          break;
        }
        case "chat_assigned": {
          setChats((prev) =>
            prev.map((c) =>
              c.id === event.chatId
                ? { ...c, assignedTo: event.assignedToId ? c.assignedTo : null }
                : c,
            ),
          );
          break;
        }
        case "chat_transferred": {
          void reloadChats();
          break;
        }
        case "chat_finished": {
          setChats((prev) =>
            prev.map((c) => (c.id === event.chatId ? { ...c, status: "finished" as const } : c)),
          );
          if (event.chatId === currentChatId && currentDetail) {
            setChatDetail({ ...currentDetail, status: "finished" });
          }
          break;
        }
        case "chat_reopened": {
          setChats((prev) =>
            prev.map((c) => (c.id === event.chatId ? { ...c, status: "in_service" as const } : c)),
          );
          if (event.chatId === currentChatId && currentDetail) {
            setChatDetail({ ...currentDetail, status: "in_service" });
          }
          break;
        }
        case "typing": {
          if (event.membershipId !== currentMembershipId) {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.set(event.membershipId, event.name);
              return next;
            });
          }
          break;
        }
        case "stop_typing": {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(event.membershipId);
            return next;
          });
          break;
        }
        case "message_read": {
          break;
        }
        case "new_note": {
          if (event.chatId === currentChatId) {
            setNotes((prev) => [...prev, event.note]);
          }
          break;
        }
        case "message_ack": {
          if (event.chatId === currentChatId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.waMessageId === event.waMessageId ? { ...m, ackLevel: event.ackLevel } : m,
              ),
            );
          }
          break;
        }
        default:
          break;
      }
    }

    return () => {
      es.close();
    };
  }, [currentMembershipId, reloadChats]);

  const handleSelectChat = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId);
    setShowInfo(false);
    setTypingUsers(new Map());

    const result = await loadChatAction({ chatId });

    if (result?.data) {
      if (result.data.detail) setChatDetail(result.data.detail);
      setMessages(result.data.messages ?? []);
      setNotes(result.data.notes ?? []);
    }

    void markReadAction({ chatId });

    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  const handleMessageSent = useCallback(
    (message: ChatMessageItem) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChatId
            ? {
                ...c,
                lastMessage: {
                  content: message.content,
                  tipo: message.tipo,
                  fromCustomer: false,
                  createdAt: message.createdAt,
                  senderName: currentAccountName,
                },
                lastActivityAt: message.createdAt,
              }
            : c,
        ),
      );
    },
    [selectedChatId, currentAccountName],
  );

  const handleChatCreated = useCallback((chat: ChatListItem) => {
    setChats((prev) => [chat, ...prev]);
    setShowCreateDialog(false);
  }, []);

  const currentTypingUsers = selectedChatId
    ? Array.from(typingUsers.entries())
        .filter(([id]) => id !== currentMembershipId)
        .map(([, name]) => name)
    : [];

  const handleBack = useCallback(() => {
    setSelectedChatId(null);
    setChatDetail(null);
    setMessages([]);
    setNotes([]);
    setShowInfo(false);
  }, []);

  const hasSelection = selectedChatId !== null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header bar */}
      <div className="border-divider-strong bg-background flex items-center gap-3 border-b px-4 py-2">
        {/* Mobile back button (visible only when chat selected on small screens) */}
        {hasSelection && (
          <button
            type="button"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground -ml-1 md:hidden"
            aria-label="Voltar para lista"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <MessageCircle className="text-muted-foreground size-5" />
        <span className="text-foreground text-sm font-medium">Chat</span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
          <Plus className="size-4" />
          Novo chat
        </Button>
      </div>

      {/* Three-panel layout — on mobile, show list XOR detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat list — hidden on mobile when a chat is selected */}
        <div className={hasSelection ? "hidden md:flex" : "flex flex-1 md:flex-none"}>
          <ChatList chats={chats} selectedChatId={selectedChatId} onSelect={handleSelectChat} />
        </div>

        {/* Center: Messages — hidden on mobile when no chat is selected */}
        <div
          className={`border-divider-strong flex flex-1 flex-col border-l ${
            hasSelection ? "" : "hidden md:flex"
          }`}
        >
          {selectedChatId && chatDetail ? (
            <ChatDetail
              chat={chatDetail}
              messages={messages}
              currentMembershipId={currentMembershipId}
              currentAccountName={currentAccountName}
              typingUsers={currentTypingUsers}
              onMessageSent={handleMessageSent}
              onToggleInfo={() => setShowInfo((p) => !p)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground text-sm">Selecione uma conversa para começar</p>
            </div>
          )}
        </div>

        {/* Right: Info panel — full overlay on mobile */}
        {showInfo && chatDetail && (
          <ChatSidebarInfo
            chat={chatDetail}
            notes={notes}
            currentMembershipId={currentMembershipId}
            onClose={() => setShowInfo(false)}
          />
        )}
      </div>

      {/* Create chat dialog */}
      {showCreateDialog && (
        <CreateChatDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleChatCreated}
        />
      )}
    </div>
  );
}
