"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BannerBlock, SignatureBlock } from "@/features/email-signature/types";

type Props = {
  block: BannerBlock;
  onUpdate: (block: SignatureBlock) => void;
};

export function BannerEditor({ block, onUpdate }: Props) {
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
      onUpdate({ ...block, imageUrl: data.url });
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">URL da imagem</Label>
          <Input
            value={block.imageUrl}
            onChange={(e) => onUpdate({ ...block, imageUrl: e.target.value })}
            placeholder="URL do banner"
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
      <div>
        <Label className="text-xs">URL do link (clique no banner)</Label>
        <Input
          value={block.linkUrl}
          onChange={(e) => onUpdate({ ...block, linkUrl: e.target.value })}
          placeholder="https://..."
          className="h-8 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs">Texto alternativo</Label>
        <Input
          value={block.altText}
          onChange={(e) => onUpdate({ ...block, altText: e.target.value })}
          placeholder="Descrição do banner"
          className="h-8 text-xs"
        />
      </div>
      {block.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded URL, cannot use next/image
        <img
          src={block.imageUrl}
          alt={block.altText || "Banner preview"}
          className="mt-1 max-h-24 rounded-md object-contain"
        />
      )}
    </div>
  );
}
