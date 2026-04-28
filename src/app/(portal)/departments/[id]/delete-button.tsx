"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteDepartmentAction } from "@/features/departments/delete-action";

type DeleteDepartmentButtonProps = {
  id: string;
  nome: string;
};

/**
 * Botão delete com confirm nativo. UX simples no V1 — em V1.5 vira Dialog
 * Radix com confirmação explícita ("digite o nome pra confirmar").
 */
export function DeleteDepartmentButton({ id, nome }: DeleteDepartmentButtonProps) {
  return (
    <form
      action={deleteDepartmentAction}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) {
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
