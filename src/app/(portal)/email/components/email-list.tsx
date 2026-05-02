"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

import { EmailListItem } from "./email-list-item";

type EmailListEmail = {
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

type EmailListProps = {
  emails: EmailListEmail[];
  selectedId: string | null;
  search: string;
  onSearchChange: (search: string) => void;
  onSelect: (emailId: string) => void;
};

export function EmailList({
  emails,
  selectedId,
  search,
  onSearchChange,
  onSelect,
}: EmailListProps) {
  return (
    <div className="border-divider-strong bg-background flex w-80 shrink-0 flex-col border-r">
      {/* Search bar */}
      <div className="border-divider-strong border-b p-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar emails..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground text-xs">Nenhum email nesta pasta</p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {emails.map((email) => (
              <li key={email.id}>
                <EmailListItem
                  email={email}
                  isSelected={email.id === selectedId}
                  onClick={() => onSelect(email.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
