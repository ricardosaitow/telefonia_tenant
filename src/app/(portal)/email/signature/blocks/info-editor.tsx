"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InfoBlock, SignatureBlock } from "@/features/email-signature/types";

type Props = {
  block: InfoBlock;
  onUpdate: (block: SignatureBlock) => void;
};

export function InfoEditor({ block, onUpdate }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <Label className="text-xs">Nome</Label>
        <Input
          value={block.name}
          onChange={(e) => onUpdate({ ...block, name: e.target.value })}
          placeholder="Seu nome"
          className="h-8 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs">Cargo</Label>
        <Input
          value={block.jobTitle}
          onChange={(e) => onUpdate({ ...block, jobTitle: e.target.value })}
          placeholder="Ex: Gerente Comercial"
          className="h-8 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs">Empresa</Label>
        <Input
          value={block.company}
          onChange={(e) => onUpdate({ ...block, company: e.target.value })}
          placeholder="Nome da empresa"
          className="h-8 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs">Departamento</Label>
        <Input
          value={block.department}
          onChange={(e) => onUpdate({ ...block, department: e.target.value })}
          placeholder="Ex: Vendas"
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
