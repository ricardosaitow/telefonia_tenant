"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ContactBlock,
  ContactItem,
  ContactType,
  SignatureBlock,
} from "@/features/email-signature/types";

type Props = {
  block: ContactBlock;
  onUpdate: (block: SignatureBlock) => void;
};

const CONTACT_TYPES: { value: ContactType; label: string; placeholder: string }[] = [
  { value: "phone", label: "Telefone", placeholder: "+55 11 99999-9999" },
  { value: "email", label: "Email", placeholder: "contato@empresa.com" },
  { value: "website", label: "Website", placeholder: "https://empresa.com" },
];

export function ContactEditor({ block, onUpdate }: Props) {
  const updateItem = (index: number, item: ContactItem) => {
    const items = [...block.items];
    items[index] = item;
    onUpdate({ ...block, items });
  };

  const addItem = () => {
    onUpdate({ ...block, items: [...block.items, { contactType: "phone", value: "" }] });
  };

  const removeItem = (index: number) => {
    onUpdate({ ...block, items: block.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-2">
      {block.items.map((item, i) => {
        const ct = CONTACT_TYPES.find((c) => c.value === item.contactType);
        return (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={item.contactType}
              onValueChange={(v) => updateItem(i, { ...item, contactType: v as ContactType })}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={item.value}
              onChange={(e) => updateItem(i, { ...item, value: e.target.value })}
              placeholder={ct?.placeholder}
              className="h-8 flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive h-8 px-1.5"
            >
              <X className="size-3" />
            </Button>
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={addItem}
        disabled={block.items.length >= 10}
        className="gap-1 self-start text-xs"
      >
        <Plus className="size-3" />
        Adicionar contato
      </Button>
    </div>
  );
}
