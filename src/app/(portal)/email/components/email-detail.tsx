"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Forward, Loader2, Reply, Star, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteEmail } from "@/features/webmail/delete-action";
import { toggleImportant } from "@/features/webmail/mark-action";
import type { EmailDetail } from "@/features/webmail/queries";

type EmailDetailViewProps = {
  email: EmailDetail;
  onReply: (email: EmailDetail) => void;
  onForward: (email: EmailDetail) => void;
  onDeleted: () => void;
};

export function EmailDetailView({ email, onReply, onForward, onDeleted }: EmailDetailViewProps) {
  const [deleting, startDelete] = useTransition();
  const [toggling, startToggle] = useTransition();

  const handleDelete = () => {
    startDelete(async () => {
      await deleteEmail({ emailId: email.id });
      onDeleted();
    });
  };

  const handleToggleImportant = () => {
    startToggle(async () => {
      await toggleImportant({ emailId: email.id });
    });
  };

  const date = email.receivedAt ?? email.sentAt;
  const dateStr = date
    ? format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : "";

  const toAddresses = parseJsonArray(email.toAddresses);
  const ccAddresses = email.ccAddresses ? parseJsonArray(email.ccAddresses) : [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="border-divider-strong flex items-center gap-1 border-b px-4 py-2">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onReply(email)}>
          <Reply className="size-4" />
          Responder
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onForward(email)}>
          <Forward className="size-4" />
          Encaminhar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={handleToggleImportant}
          disabled={toggling}
        >
          <Star className={`size-4 ${email.isImportant ? "text-accent-light fill-current" : ""}`} />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive gap-1.5"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="size-4" />
          Excluir
        </Button>
      </div>

      {/* Email header */}
      <div className="border-divider-strong flex flex-col gap-2 border-b px-4 py-3">
        <h2 className="text-foreground text-base font-semibold">
          {email.subject ?? "(sem assunto)"}
        </h2>
        <div className="flex items-center gap-2">
          <div className="bg-surface-2 flex size-8 items-center justify-center rounded-md text-xs font-semibold uppercase">
            {(email.fromName ?? email.fromAddress).charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-foreground text-sm font-medium">
              {email.fromName ?? email.fromAddress}
              {email.fromName && (
                <span className="text-muted-foreground ml-1 font-normal">
                  &lt;{email.fromAddress}&gt;
                </span>
              )}
            </p>
            <p className="text-muted-foreground text-xs">
              Para: {toAddresses.join(", ")}
              {ccAddresses.length > 0 && <> | CC: {ccAddresses.join(", ")}</>}
            </p>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">{dateStr}</span>
        </div>
      </div>

      {/* Email body — served via /api/webmail/email/:id/render with permissive CSP */}
      <div className="flex-1 overflow-hidden">
        <EmailBodyFrame emailId={email.id} />
      </div>

      {/* Attachments */}
      {email.attachments.length > 0 && (
        <div className="border-divider-strong border-t px-4 py-2">
          <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
            Anexos ({email.attachments.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {email.attachments
              .filter((a) => !a.isInline)
              .map((att) => (
                <a
                  key={att.id}
                  href={`/api/webmail/attachments/${att.id}`}
                  download={att.filename}
                  className="bg-surface-1 border-border hover:bg-surface-2 rounded-md border px-2 py-1 text-xs transition-colors"
                >
                  {att.filename}
                  {att.sizeBytes ? ` (${formatBytes(att.sizeBytes)})` : ""}
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders email body via /api/webmail/email/:id/render endpoint.
 * The endpoint serves the HTML with a permissive CSP that allows external images.
 * This avoids the parent page's strict CSP blocking newsletter images.
 */
function EmailBodyFrame({ emailId }: { emailId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && (
        <div className="flex items-center justify-center gap-2 p-8">
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
          <span className="text-muted-foreground text-sm">Carregando email...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={`/api/webmail/email/${emailId}/render`}
        sandbox="allow-same-origin allow-popups"
        title="Email content"
        className="size-full border-0"
        style={{ display: loading ? "none" : "block" }}
        onLoad={() => setLoading(false)}
      />
    </>
  );
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    return raw.split(",").map((s) => s.trim());
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
