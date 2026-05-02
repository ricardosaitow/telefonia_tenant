"use client";

import { PenSquare, RefreshCw, Stamp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { markAsRead } from "@/features/webmail/mark-action";
import type {
  EmailChannelItem,
  EmailDetail,
  EmailFolderItem,
  EmailListResult,
} from "@/features/webmail/queries";
import { syncEmailChannel } from "@/features/webmail/sync-action";

import { ComposeModal, type ComposeMode } from "./components/compose-modal";
import { EmailDetailView } from "./components/email-detail";
import { EmailList } from "./components/email-list";
import { FolderSidebar } from "./components/folder-sidebar";

type WebmailPageProps = {
  channels: EmailChannelItem[];
  defaultChannelId: string;
  activeTenantId: string;
  canSend: boolean;
  signatureHtml?: string | null;
};

export function WebmailPage({
  channels,
  defaultChannelId,
  canSend,
  signatureHtml,
}: WebmailPageProps) {
  const [activeChannelId, setActiveChannelId] = useState(defaultChannelId);
  const [folders, setFolders] = useState<EmailFolderItem[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [emailList, setEmailList] = useState<EmailListResult | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("new");
  const [sourceEmail, setSourceEmail] = useState<EmailDetail | null>(null);
  const [syncing, startSync] = useTransition();
  const [search, setSearch] = useState("");

  // Load folders for active channel
  const loadFolders = useCallback(async () => {
    const res = await fetch(`/api/webmail/folders?channelId=${activeChannelId}`);
    if (res.ok) {
      const data = (await res.json()) as EmailFolderItem[];
      setFolders(data);
      if (data.length > 0 && !activeFolderId) {
        setActiveFolderId(data[0]!.id);
      }
    }
  }, [activeChannelId, activeFolderId]);

  // Load emails for active folder
  const loadEmails = useCallback(async () => {
    if (!activeFolderId) return;
    const params = new URLSearchParams({
      channelId: activeChannelId,
      folderId: activeFolderId,
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/webmail/emails?${params}`);
    if (res.ok) {
      const data = (await res.json()) as EmailListResult;
      setEmailList(data);
    }
  }, [activeChannelId, activeFolderId, search]);

  // Load email detail metadata (body is rendered via iframe to /api/webmail/email/:id/render)
  const loadEmailDetail = useCallback(async (emailId: string) => {
    const res = await fetch(`/api/webmail/email/${emailId}`);
    if (!res.ok) return;

    const data = (await res.json()) as EmailDetail;
    setSelectedEmail(data);

    // Mark as read
    if (!data.isRead) {
      void markAsRead({ emailId, read: true });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-then-setState pattern for data loading
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-then-setState pattern for data loading
    void loadEmails();
  }, [loadEmails]);

  // Auto-sync on mount
  useEffect(() => {
    startSync(async () => {
      await syncEmailChannel({ channelId: activeChannelId });
      await loadFolders();
      await loadEmails();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, [activeChannelId]);

  const handleSync = () => {
    startSync(async () => {
      await syncEmailChannel({ channelId: activeChannelId });
      await loadFolders();
      await loadEmails();
    });
  };

  const handleSelectEmail = (emailId: string) => {
    void loadEmailDetail(emailId);
  };

  const handleReply = (email: EmailDetail) => {
    setComposeMode("reply");
    setSourceEmail(email);
    setShowCompose(true);
  };

  const handleForward = (email: EmailDetail) => {
    setComposeMode("forward");
    setSourceEmail(email);
    setShowCompose(true);
  };

  const handleComposeSent = () => {
    setShowCompose(false);
    setSourceEmail(null);
    void loadEmails();
    void loadFolders();
  };

  const handleFolderSelect = (folderId: string) => {
    setActiveFolderId(folderId);
    setSelectedEmail(null);
  };

  const handleEmailAction = () => {
    void loadEmails();
    void loadFolders();
    setSelectedEmail(null);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header bar */}
      <div className="border-divider-strong bg-background flex items-center gap-3 border-b px-4 py-2">
        {channels.length > 1 ? (
          <Select value={activeChannelId} onValueChange={setActiveChannelId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.nomeAmigavel} ({ch.identificador})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-foreground text-sm font-medium">
            {activeChannel?.nomeAmigavel} ({activeChannel?.identificador})
          </span>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-1.5"
        >
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>

        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link href="/email/signature">
            <Stamp className="size-4" />
            Assinatura
          </Link>
        </Button>

        {canSend && (
          <Button
            size="sm"
            onClick={() => {
              setComposeMode("new");
              setSourceEmail(null);
              setShowCompose(true);
            }}
            className="gap-1.5"
          >
            <PenSquare className="size-4" />
            Novo email
          </Button>
        )}
      </div>

      {/* Three-panel layout */}
      {syncing && folders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="text-muted-foreground size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">Sincronizando emails...</p>
            <p className="text-muted-foreground text-xs">
              A primeira sincronização pode demorar mais que o normal.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Folder sidebar */}
          <FolderSidebar
            folders={folders}
            activeFolderId={activeFolderId}
            onSelect={handleFolderSelect}
          />

          {/* Email list */}
          <EmailList
            emails={emailList?.emails ?? []}
            selectedId={selectedEmail?.id ?? null}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelectEmail}
          />

          {/* Detail / empty state */}
          <div className="border-divider-strong flex flex-1 flex-col border-l">
            {selectedEmail ? (
              <EmailDetailView
                email={selectedEmail}
                onReply={handleReply}
                onForward={handleForward}
                onDeleted={handleEmailAction}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground text-sm">Selecione um email para visualizar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <ComposeModal
          channelId={activeChannelId}
          mode={composeMode}
          sourceEmail={sourceEmail}
          signatureHtml={signatureHtml}
          onClose={() => {
            setShowCompose(false);
            setSourceEmail(null);
          }}
          onSent={handleComposeSent}
        />
      )}
    </div>
  );
}
