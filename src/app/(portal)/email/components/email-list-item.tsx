"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type EmailListItemProps = {
  email: {
    id: string;
    fromAddress: string;
    fromName: string | null;
    subject: string | null;
    preview: string | null;
    sentAt: string | Date | null;
    receivedAt: string | Date | null;
    isRead: boolean;
    isImportant: boolean;
  };
  isSelected: boolean;
  onClick: () => void;
};

export function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const date = email.receivedAt ?? email.sentAt;
  const dateStr = date
    ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-divider-strong flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors",
        isSelected ? "bg-glass-bg" : "hover:bg-glass-bg/50",
        !email.isRead && "bg-surface-1",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex-1 truncate text-sm",
            !email.isRead ? "text-foreground font-semibold" : "text-foreground",
          )}
        >
          {email.fromName ?? email.fromAddress}
        </span>
        {email.isImportant && <Star className="text-accent-light size-3.5 shrink-0 fill-current" />}
        <span className="text-muted-foreground shrink-0 text-[10px]">{dateStr}</span>
      </div>
      <span
        className={cn(
          "truncate text-xs",
          !email.isRead ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {email.subject ?? "(sem assunto)"}
      </span>
      <span className="text-muted-foreground truncate text-[11px]">{email.preview ?? ""}</span>
    </button>
  );
}
