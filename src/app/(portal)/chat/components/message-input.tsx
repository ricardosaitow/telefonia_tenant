"use client";

import { Paperclip, Send } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { QuickReplyPicker } from "./quick-reply-picker";

type MessageInputProps = {
  onSend: (content: string) => void;
  onSendMedia?: (file: File) => void;
  onTyping: () => void;
  disabled?: boolean;
};

export function MessageInput({ onSend, onSendMedia, onTyping, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [quickReplyPrefix, setQuickReplyPrefix] = useState("");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    setShowQuickReply(false);
  }, [value, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showQuickReply) return; // Let quick reply picker handle keys
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Quick reply trigger: starts with "/" at beginning of input
    if (newValue.startsWith("/") && newValue.length > 1) {
      setShowQuickReply(true);
      setQuickReplyPrefix(newValue);
    } else {
      setShowQuickReply(false);
    }

    // Debounce typing indicator (300ms)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping();
    }, 300);
  };

  const handleQuickReplySelect = (content: string) => {
    setValue(content);
    setShowQuickReply(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendMedia) {
      onSendMedia(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-divider-strong relative border-t px-4 py-3">
      {/* Quick reply picker */}
      {showQuickReply && (
        <QuickReplyPicker
          prefix={quickReplyPrefix}
          onSelect={handleQuickReplySelect}
          onClose={() => setShowQuickReply(false)}
        />
      )}

      <div className="flex items-end gap-2">
        {/* File upload button */}
        {onSendMedia && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="shrink-0"
            >
              <Paperclip className="size-4" />
            </Button>
          </>
        )}

        <textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem... (/ para atalhos)"
          disabled={disabled}
          rows={1}
          className={
            "bg-surface-1 text-foreground placeholder:text-muted-foreground " +
            "border-border flex-1 resize-none rounded-md border px-3 py-2 text-sm " +
            "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none " +
            "disabled:opacity-50"
          }
          style={{ maxHeight: "120px", minHeight: "38px" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
