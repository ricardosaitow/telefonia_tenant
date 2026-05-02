"use client";

import { AlertTriangle, Archive, FileText, Inbox, Send, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import type { EmailFolderItem } from "@/features/webmail/queries";
import { cn } from "@/lib/utils";

type FolderSidebarProps = {
  folders: EmailFolderItem[];
  activeFolderId: string | null;
  onSelect: (folderId: string) => void;
};

const FOLDER_ICONS: Record<string, ReactNode> = {
  inbox: <Inbox className="size-4" />,
  sent: <Send className="size-4" />,
  drafts: <FileText className="size-4" />,
  trash: <Trash2 className="size-4" />,
  spam: <AlertTriangle className="size-4" />,
  archived: <Archive className="size-4" />,
};

export function FolderSidebar({ folders, activeFolderId, onSelect }: FolderSidebarProps) {
  return (
    <div className="border-divider-strong bg-surface-1 flex w-48 shrink-0 flex-col border-r">
      <nav className="flex flex-col gap-0.5 p-2">
        {folders.map((folder) => {
          const isActive = folder.id === activeFolderId;

          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelect(folder.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-glass-bg text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-glass-bg",
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {FOLDER_ICONS[folder.tipo] ?? <Inbox className="size-4" />}
              </span>
              <span className="flex-1 truncate text-left">{folder.nome}</span>
              {folder.unreadEmails > 0 && (
                <span className="bg-accent-light/20 text-accent-light rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                  {folder.unreadEmails}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
