"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRoutingRuleAction } from "@/features/routing/create-action";

type Target = { id: string; nome: string };
type AgentTarget = Target & { department: { nome: string } };

type CreateRoutingRuleFormProps = {
  channelId: string;
  departments: Target[];
  agents: AgentTarget[];
};

export function CreateRoutingRuleForm({
  channelId,
  departments,
  agents,
}: CreateRoutingRuleFormProps) {
  const [targetType, setTargetType] = useState<"department" | "agent">("department");

  const options = targetType === "department" ? departments : agents;

  return (
    <form action={createRoutingRuleAction} className="flex flex-col gap-3">
      <input type="hidden" name="channelId" value={channelId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetType">Tipo de destino</Label>
          <Select
            name="targetType"
            value={targetType}
            onValueChange={(v) => setTargetType(v as "department" | "agent")}
          >
            <SelectTrigger id="targetType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="department">Departamento</SelectItem>
              <SelectItem value="agent">Agente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetId">Destino</Label>
          <Select name="targetId" key={targetType}>
            <SelectTrigger id="targetId">
              <SelectValue placeholder="Escolha…" />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 ? (
                <SelectItem value="__empty__" disabled>
                  Nenhum disponível
                </SelectItem>
              ) : (
                options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.nome}
                    {targetType === "agent" && "department" in opt
                      ? ` · ${(opt as AgentTarget).department.nome}`
                      : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Adicionar regra
        </Button>
      </div>
    </form>
  );
}
