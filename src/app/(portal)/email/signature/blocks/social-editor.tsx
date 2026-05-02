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
  SignatureBlock,
  SocialBlock,
  SocialItem,
  SocialPlatform,
} from "@/features/email-signature/types";
import { SOCIAL_PLATFORMS } from "@/features/email-signature/types";

type Props = {
  block: SocialBlock;
  onUpdate: (block: SignatureBlock) => void;
};

export function SocialEditor({ block, onUpdate }: Props) {
  const updateItem = (index: number, item: SocialItem) => {
    const items = [...block.items];
    items[index] = item;
    onUpdate({ ...block, items });
  };

  const addItem = () => {
    // Find first platform not yet used
    const used = new Set(block.items.map((i) => i.platform));
    const first = SOCIAL_PLATFORMS.find((p) => !used.has(p.value));
    const platform = first?.value ?? "linkedin";
    onUpdate({ ...block, items: [...block.items, { platform, url: "" }] });
  };

  const removeItem = (index: number) => {
    onUpdate({ ...block, items: block.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-2">
      {block.items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select
            value={item.platform}
            onValueChange={(v) => updateItem(i, { ...item, platform: v as SocialPlatform })}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={item.url}
            onChange={(e) => updateItem(i, { ...item, url: e.target.value })}
            placeholder="https://..."
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
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={addItem}
        disabled={block.items.length >= 7}
        className="gap-1 self-start text-xs"
      >
        <Plus className="size-3" />
        Adicionar rede social
      </Button>
    </div>
  );
}
