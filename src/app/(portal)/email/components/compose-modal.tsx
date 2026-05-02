"use client";

import { Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EmailDetail } from "@/features/webmail/queries";

export type ComposeMode = "new" | "reply" | "forward";

type ComposeModalProps = {
  channelId: string;
  mode: ComposeMode;
  sourceEmail: EmailDetail | null;
  signatureHtml?: string | null;
  onClose: () => void;
  onSent: () => void;
};

export function ComposeModal({
  channelId,
  mode,
  sourceEmail,
  signatureHtml,
  onClose,
  onSent,
}: ComposeModalProps) {
  const [to, setTo] = useState(() => {
    if (mode === "reply" && sourceEmail) return sourceEmail.fromAddress;
    return "";
  });
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(() => {
    if (!sourceEmail) return "";
    const raw = sourceEmail.subject ?? "";
    if (mode === "reply") return `Re: ${raw.replace(/^Re:\s*/i, "")}`;
    if (mode === "forward") return `Fwd: ${raw.replace(/^Fwd:\s*/i, "")}`;
    return "";
  });
  const [body, setBody] = useState(() => {
    if (!sourceEmail) return "";
    if (mode === "reply") {
      return `\n\n---\nEm ${formatDate(sourceEmail.receivedAt ?? sourceEmail.sentAt)}, ${sourceEmail.fromName ?? sourceEmail.fromAddress} escreveu:\n> ${(sourceEmail.bodyText ?? "").split("\n").join("\n> ")}`;
    }
    if (mode === "forward") {
      const toAddrs = parseJsonArray(sourceEmail.toAddresses);
      return `\n\n---------- Mensagem encaminhada ----------\nDe: ${sourceEmail.fromName ?? sourceEmail.fromAddress} <${sourceEmail.fromAddress}>\nData: ${formatDate(sourceEmail.receivedAt ?? sourceEmail.sentAt)}\nAssunto: ${sourceEmail.subject ?? "(sem assunto)"}\nPara: ${toAddrs.join(", ")}\n\n${sourceEmail.bodyText ?? ""}`;
    }
    return "";
  });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, 10);
    });
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    setError(null);
    startSend(async () => {
      const formData = new FormData();
      formData.set("channelId", channelId);
      formData.set("to", to);
      if (cc) formData.set("cc", cc);
      formData.set("subject", subject);
      formData.set("body", body);
      formData.set("mode", mode);
      if (mode === "reply" && sourceEmail) {
        formData.set("inReplyTo", sourceEmail.id);
      }
      for (const file of files) {
        formData.append("attachments", file);
      }

      const res = await fetch("/api/webmail/send", { method: "POST", body: formData });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao enviar email.");
        return;
      }

      onSent();
    });
  };

  const title = mode === "reply" ? "Responder" : mode === "forward" ? "Encaminhar" : "Novo email";

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-background border-border flex w-full max-w-2xl flex-col rounded-t-lg border shadow-lg sm:rounded-lg">
        {/* Header */}
        <div className="border-divider-strong flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4">
          {error && (
            <div className="border-destructive/50 bg-destructive/10 rounded-md border p-2">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-to">Para</Label>
            <Input
              id="compose-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@exemplo.com"
              autoComplete="off"
            />
          </div>

          {showCc ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compose-cc">CC</Label>
              <Input
                id="compose-cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Opcional"
                autoComplete="off"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="text-muted-foreground hover:text-foreground self-start text-xs underline"
            >
              CC
            </button>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-subject">Assunto</Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-body">Mensagem</Label>
            <Textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Escreva sua mensagem..."
            />
          </div>

          {/* Signature preview */}
          {signatureHtml && (
            <div className="border-border overflow-hidden rounded-md border bg-white p-3">
              <p className="text-muted-foreground mb-1 text-xs">Assinatura</p>
              <SignatureShadow html={signatureHtml} />
            </div>
          )}

          {/* Attachments */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleAddFiles}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 self-start"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 10}
            >
              <Paperclip className="size-4" />
              Anexar arquivo
              {files.length > 0 && ` (${files.length})`}
            </Button>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, idx) => (
                  <span
                    key={`${file.name}-${idx}`}
                    className="bg-surface-1 border-border flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                  >
                    {file.name} ({formatBytes(file.size)})
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-divider-strong flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || !to || !body}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(date: string | Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleString("pt-BR");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SignatureShadow({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let shadow = el.shadowRoot;
    if (!shadow) shadow = el.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>:host{display:block;pointer-events:none}img{max-width:100%;height:auto}</style>${html}`;
  }, [html]);
  return <div ref={ref} />;
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    return raw.split(",").map((s) => s.trim());
  }
}
