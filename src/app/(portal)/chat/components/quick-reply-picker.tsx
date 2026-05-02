"use client";

import { useEffect, useState } from "react";

import {
  searchQuickRepliesAction,
  trackQuickReplyUsageAction,
} from "@/features/quick-replies/search-action";

type QuickReplyResult = {
  id: string;
  title: string;
  shortcut: string;
  content: string;
};

type QuickReplyPickerProps = {
  prefix: string;
  onSelect: (content: string) => void;
  onClose: () => void;
};

export function QuickReplyPicker({ prefix, onSelect, onClose }: QuickReplyPickerProps) {
  const [results, setResults] = useState<QuickReplyResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (!prefix) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear results when prefix is empty
      setResults([]);
      return;
    }

    void searchQuickRepliesAction({ prefix }).then((res) => {
      if (res?.data?.replies) {
        setResults(res.data.replies);
        setSelectedIdx(0);
      }
    });
  }, [prefix]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = results[selectedIdx];
        if (selected) {
          void trackQuickReplyUsageAction({ id: selected.id });
          onSelect(selected.content);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIdx, onSelect, onClose]);

  if (results.length === 0) return null;

  return (
    <div className="border-border bg-card shadow-modal absolute bottom-full left-0 mb-1 w-72 rounded-md border">
      <ul className="max-h-48 overflow-y-auto py-1">
        {results.map((r, i) => (
          <li key={r.id}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                void trackQuickReplyUsageAction({ id: r.id });
                onSelect(r.content);
              }}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-sm ${
                i === selectedIdx ? "bg-glass-bg" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-accent-light font-mono text-xs">{r.shortcut}</span>
                <span className="text-foreground truncate text-xs font-medium">{r.title}</span>
              </div>
              <p className="text-muted-foreground truncate text-xs">{r.content}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
