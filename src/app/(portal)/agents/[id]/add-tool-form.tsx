"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAgentToolAction } from "@/features/tools/agent-tool-actions";

type Props = {
  agentId: string;
};

export function AddAgentToolForm({ agentId }: Props) {
  return (
    <Card variant="solid" padding="default" className="gap-3">
      <div className="flex items-center gap-2">
        <Plus className="text-muted-foreground size-4" />
        <h3 className="text-foreground text-sm font-medium">Adicionar tool</h3>
      </div>
      <form action={addAgentToolAction} className="flex items-end gap-2">
        <input type="hidden" name="agentId" value={agentId} />
        <div className="flex-1">
          <Label htmlFor="toolKey">Chave da tool</Label>
          <Input
            id="toolKey"
            name="toolKey"
            type="text"
            required
            pattern="[a-z0-9_]+"
            placeholder="consultar_produto"
            className="mt-1"
          />
        </div>
        <Button type="submit" size="sm">
          Adicionar
        </Button>
      </form>
      <p className="text-muted-foreground text-xs">
        V1: chave livre. Catálogo Pekiart (consultar_produto, transferir_humano, etc) chega em V1.x
        como select.
      </p>
    </Card>
  );
}
