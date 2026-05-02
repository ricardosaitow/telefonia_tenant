"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SignatureStyle } from "@/features/email-signature/types";
import { EMAIL_SAFE_FONTS } from "@/features/email-signature/types";

type Props = {
  style: SignatureStyle;
  onChange: (style: SignatureStyle) => void;
};

export function StyleControls({ style, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-foreground text-sm font-semibold">Estilo global</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Label className="w-24 shrink-0 text-xs">Cor primária</Label>
          <input
            type="color"
            value={style.primaryColor}
            onChange={(e) => onChange({ ...style, primaryColor: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded-md border-0"
          />
          <Input
            value={style.primaryColor}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                onChange({ ...style, primaryColor: e.target.value });
              }
            }}
            className="h-8 w-24 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-24 shrink-0 text-xs">Cor do texto</Label>
          <input
            type="color"
            value={style.textColor}
            onChange={(e) => onChange({ ...style, textColor: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded-md border-0"
          />
          <Input
            value={style.textColor}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                onChange({ ...style, textColor: e.target.value });
              }
            }}
            className="h-8 w-24 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Fonte</Label>
          <Select
            value={style.fontFamily}
            onValueChange={(v) => onChange({ ...style, fontFamily: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_SAFE_FONTS.map((font) => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font.split(",")[0]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tamanho da fonte (px)</Label>
          <Input
            type="number"
            min={12}
            max={18}
            value={style.fontSize}
            onChange={(e) => onChange({ ...style, fontSize: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
