"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteChannelAction } from "@/features/channels/delete-action";

type DeleteChannelButtonProps = {
  id: string;
  nome: string;
};

export function DeleteChannelButton({ id, nome }: DeleteChannelButtonProps) {
  return (
    <form
      action={deleteChannelAction}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir canal "${nome}"? Esta ação não pode ser desfeita.`)) {
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
