"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteAgentAction } from "@/features/agents/delete-action";

type DeleteAgentButtonProps = {
  id: string;
  nome: string;
};

export function DeleteAgentButton({ id, nome }: DeleteAgentButtonProps) {
  return (
    <form
      action={deleteAgentAction}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir agente "${nome}"? Esta ação não pode ser desfeita.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 />
        Excluir
      </Button>
    </form>
  );
}
