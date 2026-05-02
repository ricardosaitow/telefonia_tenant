"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createChatAction } from "@/features/chat/create-chat-action";
import type { ChatListItem } from "@/features/chat/types";

type CreateChatDialogProps = {
  onClose: () => void;
  onCreated: (chat: ChatListItem) => void;
};

export function CreateChatDialog({ onClose, onCreated }: CreateChatDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [participantInput, setParticipantInput] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [creating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAddParticipant = () => {
    const id = participantInput.trim();
    if (!id) return;
    if (participantIds.includes(id)) return;
    setParticipantIds((prev) => [...prev, id]);
    setParticipantInput("");
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipantIds((prev) => prev.filter((p) => p !== id));
  };

  const handleCreate = () => {
    if (participantIds.length === 0) {
      setError("Adicione ao menos um participante.");
      return;
    }

    startCreate(async () => {
      const result = await createChatAction({
        titulo: titulo.trim() || undefined,
        participantIds,
      });

      if (result?.data?.ok && result.data.chatId) {
        // Create a minimal ChatListItem for optimistic update
        const newChat: ChatListItem = {
          id: result.data.chatId,
          tipo: "internal",
          titulo: titulo.trim() || null,
          protocol: null,
          status: "in_service",
          priority: "normal",
          customerPhone: null,
          customerName: null,
          customerAvatarUrl: null,
          pinned: false,
          archived: false,
          lastActivityAt: new Date().toISOString(),
          lastMessage: null,
          assignedTo: null,
          department: null,
          unreadCount: 0,
        };
        onCreated(newChat);
      } else {
        setError("Erro ao criar chat.");
      }
    });
  };

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border shadow-modal flex w-full max-w-md flex-col rounded-lg border">
        {/* Header */}
        <div className="border-divider-strong flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-foreground text-sm font-medium">Novo chat interno</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo" className="text-xs">
              Título (opcional)
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome do grupo..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="participant" className="text-xs">
              ID do participante
            </Label>
            <div className="flex gap-2">
              <Input
                id="participant"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                placeholder="Membership ID..."
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddParticipant}
                disabled={!participantInput.trim()}
              >
                Adicionar
              </Button>
            </div>
          </div>

          {participantIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {participantIds.map((id) => (
                <span
                  key={id}
                  className="bg-surface-2 text-foreground flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                >
                  {id.slice(0, 8)}...
                  <button
                    onClick={() => handleRemoveParticipant(id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-divider-strong flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating || participantIds.length === 0}
          >
            Criar chat
          </Button>
        </div>
      </div>
    </div>
  );
}
