"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DividerBlock, SignatureBlock } from "@/features/email-signature/types";

type Props = {
  block: DividerBlock;
  onUpdate: (block: SignatureBlock) => void;
};

export function DividerEditor({ block, onUpdate }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Cor</Label>
        <input
          type="color"
          value={block.color}
          onChange={(e) => onUpdate({ ...block, color: e.target.value })}
          className="h-8 w-8 cursor-pointer rounded-md border-0"
        />
      </div>
      <Input
        value={block.color}
        onChange={(e) => {
          if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
            onUpdate({ ...block, color: e.target.value });
          }
        }}
        className="h-8 w-24 text-xs"
        placeholder="#cccccc"
      />
      <div className="flex-1">
        <div className="h-px w-full" style={{ backgroundColor: block.color }} />
      </div>
    </div>
  );
}
