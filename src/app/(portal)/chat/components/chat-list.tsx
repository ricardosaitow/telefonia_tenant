"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { ChatListItem, ChatStatus, ChatType } from "@/features/chat/types";

import { ChatFilters } from "./chat-filters";
import { ChatListItem as ChatListItemComponent } from "./chat-list-item";

type ChatListProps = {
  chats: ChatListItem[];
  selectedChatId: string | null;
  onSelect: (chatId: string) => void;
};

export function ChatList({ chats, selectedChatId, onSelect }: ChatListProps) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<ChatType | null>(null);
  const [filterStatus, setFilterStatus] = useState<ChatStatus | null>(null);

  const filtered = useMemo(() => {
    let result = chats;

    if (filterTipo) {
      result = result.filter((c) => c.tipo === filterTipo);
    }
    if (filterStatus) {
      result = result.filter((c) => c.status === filterStatus);
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.titulo?.toLowerCase().includes(term) ||
          c.customerName?.toLowerCase().includes(term) ||
          c.customerPhone?.includes(term) ||
          c.protocol?.includes(term) ||
          c.lastMessage?.content.toLowerCase().includes(term),
      );
    }

    return result;
  }, [chats, filterTipo, filterStatus, search]);

  return (
    <div className="bg-background flex w-full shrink-0 flex-col overflow-hidden md:w-80">
      {/* Search */}
      <div className="border-divider-strong border-b p-2">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="border-divider-strong border-b py-1.5">
        <ChatFilters
          tipo={filterTipo}
          status={filterStatus}
          onTipoChange={setFilterTipo}
          onStatusChange={setFilterStatus}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground text-xs">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((chat) => (
              <ChatListItemComponent
                key={chat.id}
                chat={chat}
                isSelected={chat.id === selectedChatId}
                onSelect={() => onSelect(chat.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
