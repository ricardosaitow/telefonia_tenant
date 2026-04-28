"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteKnowledgeSourceAction } from "@/features/knowledge/delete-action";

type Props = { id: string; nome: string };

export function DeleteKnowledgeButton({ id, nome }: Props) {
  return (
    <form
      action={deleteKnowledgeSourceAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Excluir "${nome}"? Vínculos com agentes também serão removidos. Esta ação não pode ser desfeita.`,
          )
        ) {
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
