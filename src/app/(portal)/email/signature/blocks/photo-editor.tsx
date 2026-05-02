"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PhotoBlock, SignatureBlock } from "@/features/email-signature/types";

type Props = {
  block: PhotoBlock;
  onUpdate: (block: SignatureBlock) => void;
};

export function PhotoEditor({ block, onUpdate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/signature-images/upload", {
      method: "POST",
      body: formData,
    });
    const data = (await res.json()) as { url?: string; error?: string };
    setUploading(false);
    if (data.url) {
      onUpdate({ ...block, url: data.url });
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">URL da imagem</Label>
          <Input
            value={block.url}
            onChange={(e) => onUpdate({ ...block, url: e.target.value })}
            placeholder="URL ou faça upload"
            className="h-8 text-xs"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="size-3" />
          {uploading ? "..." : "Upload"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Tamanho (px)</Label>
          <Input
            type="number"
            min={40}
            max={200}
            value={block.size}
            onChange={(e) => onUpdate({ ...block, size: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Arredondamento (%)</Label>
          <Input
            type="number"
            min={0}
            max={50}
            value={block.borderRadius}
            onChange={(e) => onUpdate({ ...block, borderRadius: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {block.url && (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded URL, cannot use next/image
        <img
          src={block.url}
          alt="Preview"
          className="mt-1"
          style={{
            width: block.size,
            height: block.size,
            borderRadius: `${block.borderRadius}%`,
            objectFit: "cover",
          }}
        />
      )}
    </div>
  );
}
