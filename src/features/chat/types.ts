import type {
  Chat,
  ChatMessage,
  ChatMessageType,
  ChatNote,
  ChatParticipant,
  ChatPriority,
  ChatStatus,
  ChatType,
} from "@/generated/prisma/client";

export type {
  ChatMessage,
  ChatMessageType,
  ChatNote,
  ChatParticipant,
  ChatPriority,
  ChatStatus,
  ChatType,
};

// ---------- Serialized types for client components ----------

export type ChatListItem = {
  id: string;
  tipo: ChatType;
  titulo: string | null;
  protocol: string | null;
  status: ChatStatus;
  priority: ChatPriority;
  customerPhone: string | null;
  customerName: string | null;
  customerAvatarUrl: string | null;
  pinned: boolean;
  archived: boolean;
  lastActivityAt: string;
  lastMessage: {
    content: string;
    tipo: ChatMessageType;
    fromCustomer: boolean;
    createdAt: string;
    senderName: string | null;
  } | null;
  assignedTo: { id: string; accountName: string } | null;
  department: { id: string; nome: string } | null;
  unreadCount: number;
};

export type ChatDetailData = {
  id: string;
  tipo: ChatType;
  titulo: string | null;
  protocol: string | null;
  status: ChatStatus;
  priority: ChatPriority;
  tags: string[];
  customerPhone: string | null;
  customerName: string | null;
  customerAvatarUrl: string | null;
  channelId: string | null;
  pinned: boolean;
  archived: boolean;
  blocked: boolean;
  createdAt: string;
  assignedTo: { id: string; accountName: string } | null;
  department: { id: string; nome: string } | null;
  participants: Array<{
    id: string;
    membershipId: string;
    accountName: string;
    isAdmin: boolean;
    lastReadAt: string;
  }>;
};

export type ChatMessageItem = {
  id: string;
  content: string;
  tipo: ChatMessageType;
  fromCustomer: boolean;
  waMessageId: string | null;
  ackLevel: number | null;
  edited: boolean;
  deletedAt: string | null;
  mediaUrl: string | null;
  mediaName: string | null;
  mediaMimeType: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationName: string | null;
  quotedMessageId: string | null;
  quotedMessage: { content: string; senderName: string | null } | null;
  senderMembershipId: string | null;
  senderName: string | null;
  createdAt: string;
};

export type ChatNoteItem = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
};

// ---------- Helpers ----------

/**
 * Format a WID (e.g. "5511987654321@s.whatsapp.net" or "123456@lid") for display.
 * Returns a human-readable phone like "+5511987654321" or the raw number for LIDs.
 */
export function formatPhoneForDisplay(wid: string | null): string | null {
  if (!wid) return null;
  const num = wid.split("@")[0];
  if (wid.includes("@lid")) return num;
  return `+${num}`;
}

// ---------- SSE Event types ----------

export type ChatEvent =
  | { type: "new_message"; chatId: string; message: ChatMessageItem }
  | { type: "new_chat"; chat: ChatListItem }
  | { type: "chat_updated"; chatId: string; changes: Partial<Chat> }
  | { type: "chat_assigned"; chatId: string; assignedToId: string | null }
  | { type: "chat_transferred"; chatId: string; departmentId: string }
  | { type: "chat_finished"; chatId: string }
  | { type: "chat_reopened"; chatId: string }
  | { type: "typing"; chatId: string; membershipId: string; name: string }
  | { type: "stop_typing"; chatId: string; membershipId: string }
  | { type: "message_ack"; chatId: string; waMessageId: string; ackLevel: number }
  | { type: "message_read"; chatId: string; membershipId: string }
  | { type: "new_note"; chatId: string; note: ChatNoteItem }
  | { type: "user_status"; membershipId: string; status: "online" | "offline" };
