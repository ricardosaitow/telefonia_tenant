"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addAgentKnowledgeAction } from "@/features/knowledge/agent-link-actions";

type Option = { id: string; nome: string };

type Props = {
  agentId: string;
  options: Option[];
};

export function AddAgentKnowledgeForm({ agentId, options }: Props) {
  return (
    <form action={addAgentKnowledgeAction} className="flex items-end gap-2">
      <input type="hidden" name="agentId" value={agentId} />
      <div className="flex-1">
        <Select name="knowledgeSourceId" defaultValue={options[0]?.id}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm">
        Vincular
      </Button>
    </form>
  );
}
