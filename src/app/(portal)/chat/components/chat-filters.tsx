"use client";

import type { ChatStatus, ChatType } from "@/features/chat/types";

type ChatFiltersProps = {
  tipo: ChatType | null;
  status: ChatStatus | null;
  onTipoChange: (tipo: ChatType | null) => void;
  onStatusChange: (status: ChatStatus | null) => void;
};

const tipoOptions: Array<{ value: ChatType | null; label: string }> = [
  { value: null, label: "Todos" },
  { value: "internal", label: "Interno" },
  { value: "whatsapp", label: "WhatsApp" },
];

const statusOptions: Array<{ value: ChatStatus | null; label: string }> = [
  { value: null, label: "Todos" },
  { value: "triage", label: "Triagem" },
  { value: "waiting", label: "Aguardando" },
  { value: "in_service", label: "Em atendimento" },
  { value: "finished", label: "Finalizado" },
];

export function ChatFilters({ tipo, status, onTipoChange, onStatusChange }: ChatFiltersProps) {
  return (
    <div className="flex gap-1 px-2 pb-1">
      {/* Tipo filter */}
      <div className="flex gap-0.5">
        {tipoOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onTipoChange(opt.value)}
            className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
              tipo === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="border-divider-strong mx-1 border-l" />

      {/* Status filter */}
      <div className="flex gap-0.5">
        {statusOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onStatusChange(opt.value)}
            className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
              status === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
