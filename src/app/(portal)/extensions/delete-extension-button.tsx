"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteExtensionAction } from "@/features/extensions/delete-action";

type Props = {
  id: string;
  extension: string;
};

export function DeleteExtensionButton({ id, extension }: Props) {
  return (
    <form
      action={deleteExtensionAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Excluir ramal "${extension}"? Apaga aqui e no FusionPBX. ` +
              `Esta ação não pode ser desfeita.`,
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
