"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StickyNote, Users, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { addNoteAction } from "@/features/chat/add-note-action";
import {
  type ChatDetailData,
  type ChatNoteItem,
  formatPhoneForDisplay,
} from "@/features/chat/types";

type ChatSidebarInfoProps = {
  chat: ChatDetailData;
  notes: ChatNoteItem[];
  currentMembershipId: string;
  onClose: () => void;
};

export function ChatSidebarInfo({
  chat,
  notes,
  currentMembershipId,
  onClose,
}: ChatSidebarInfoProps) {
  const [noteContent, setNoteContent] = useState("");
  const [saving, startSave] = useTransition();

  const handleAddNote = () => {
    const content = noteContent.trim();
    if (!content) return;

    startSave(async () => {
      await addNoteAction({ chatId: chat.id, content });
      setNoteContent("");
    });
  };

  const statusLabel: Record<string, string> = {
    triage: "Triagem",
    waiting: "Aguardando",
    in_service: "Em atendimento",
    finished: "Finalizado",
  };

  const priorityLabel: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  return (
    <div className="border-divider-strong bg-background absolute inset-0 z-10 flex flex-col md:relative md:inset-auto md:z-auto md:w-72 md:shrink-0 md:border-l">
      {/* Header */}
      <div className="border-divider-strong flex items-center justify-between border-b px-4 py-2">
        <span className="text-foreground text-sm font-medium">Detalhes</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Chat info */}
        <div className="border-divider-strong border-b px-4 py-3">
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Status</dt>
              <dd className="text-foreground">{statusLabel[chat.status]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Prioridade</dt>
              <dd className="text-foreground">{priorityLabel[chat.priority]}</dd>
            </div>
            {chat.department && (
              <div>
                <dt className="text-muted-foreground text-xs">Departamento</dt>
                <dd className="text-foreground">{chat.department.nome}</dd>
              </div>
            )}
            {chat.assignedTo && (
              <div>
                <dt className="text-muted-foreground text-xs">Atribuído a</dt>
                <dd className="text-foreground">{chat.assignedTo.accountName}</dd>
              </div>
            )}
            {chat.protocol && (
              <div>
                <dt className="text-muted-foreground text-xs">Protocolo</dt>
                <dd className="text-foreground font-mono text-xs">{chat.protocol}</dd>
              </div>
            )}
            {chat.customerPhone && (
              <div>
                <dt className="text-muted-foreground text-xs">Telefone</dt>
                <dd className="text-foreground">{formatPhoneForDisplay(chat.customerPhone)}</dd>
              </div>
            )}
            {chat.tags.length > 0 && (
              <div>
                <dt className="text-muted-foreground text-xs">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {chat.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-surface-2 text-foreground rounded-md px-1.5 py-0.5 text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground text-xs">Criado em</dt>
              <dd className="text-foreground text-xs">
                {format(new Date(chat.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Participants */}
        <div className="border-divider-strong border-b px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Users className="text-muted-foreground size-4" />
            <span className="text-foreground text-xs font-medium">
              Participantes ({chat.participants.length})
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {chat.participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <div className="bg-surface-2 flex size-6 items-center justify-center rounded-md text-[10px] font-medium">
                  {p.accountName.charAt(0).toUpperCase()}
                </div>
                <span className="text-foreground text-xs">
                  {p.accountName}
                  {p.isAdmin && (
                    <span className="text-muted-foreground ml-1 text-[10px]">admin</span>
                  )}
                  {p.membershipId === currentMembershipId && (
                    <span className="text-muted-foreground ml-1 text-[10px]">(você)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Notes */}
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <StickyNote className="text-muted-foreground size-4" />
            <span className="text-foreground text-xs font-medium">
              Notas internas ({notes.length})
            </span>
          </div>

          {notes.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2">
              {notes.map((note) => (
                <li key={note.id} className="bg-surface-1 rounded-md px-2.5 py-2">
                  <p className="text-foreground text-xs whitespace-pre-wrap">{note.content}</p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {note.authorName} ·{" "}
                    {format(new Date(note.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* Add note */}
          <div className="flex flex-col gap-1.5">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Adicionar nota..."
              rows={2}
              className={
                "bg-surface-1 text-foreground placeholder:text-muted-foreground " +
                "border-border resize-none rounded-md border px-2.5 py-1.5 text-xs " +
                "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none"
              }
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddNote}
              disabled={saving || !noteContent.trim()}
              className="self-end text-xs"
            >
              Salvar nota
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
