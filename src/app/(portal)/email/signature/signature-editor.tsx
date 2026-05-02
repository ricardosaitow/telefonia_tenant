"use client";

import { Save } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveSignature } from "@/features/email-signature/save-action";
import type { SignatureBlock, SignatureConfig } from "@/features/email-signature/types";

import { BannerEditor } from "./blocks/banner-editor";
import { ContactEditor } from "./blocks/contact-editor";
import { DividerEditor } from "./blocks/divider-editor";
import { InfoEditor } from "./blocks/info-editor";
import { PhotoEditor } from "./blocks/photo-editor";
import { SocialEditor } from "./blocks/social-editor";
import { StyleControls } from "./blocks/style-controls";
import { SignaturePreview } from "./signature-preview";

type SignatureEditorProps = {
  initialConfig: SignatureConfig;
  memberName: string;
};

export function SignatureEditor({ initialConfig, memberName }: SignatureEditorProps) {
  const [config, setConfig] = useState<SignatureConfig>(() => {
    // Auto-fill name from profile if info block is empty
    const cfg = structuredClone(initialConfig);
    const infoBlock = cfg.blocks.find((b) => b.type === "info");
    if (infoBlock && infoBlock.type === "info" && !infoBlock.name) {
      infoBlock.name = memberName;
    }
    return cfg;
  });
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateBlock = useCallback((index: number, block: SignatureBlock) => {
    setConfig((prev) => {
      const blocks = [...prev.blocks];
      blocks[index] = block;
      return { ...prev, blocks };
    });
    setSaved(false);
  }, []);

  const addBlock = useCallback((block: SignatureBlock) => {
    setConfig((prev) => ({
      ...prev,
      blocks: [...prev.blocks, block],
    }));
    setSaved(false);
  }, []);

  const removeBlock = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index),
    }));
    setSaved(false);
  }, []);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    setConfig((prev) => {
      const blocks = [...prev.blocks];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= blocks.length) return prev;
      [blocks[index], blocks[newIndex]] = [blocks[newIndex]!, blocks[index]!];
      return { ...prev, blocks };
    });
    setSaved(false);
  }, []);

  const handleSave = () => {
    setError(null);
    startSave(async () => {
      try {
        const result = await saveSignature({ config });
        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  const blockTypes = config.blocks.map((b) => b.type);
  const canAddPhoto = !blockTypes.includes("photo");
  const canAddBanner = !blockTypes.includes("banner");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor column */}
      <div className="flex flex-col gap-4">
        <Card variant="solid" padding="default">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground text-sm font-semibold">Blocos</h3>
              <div className="flex gap-2">
                {canAddPhoto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addBlock({ type: "photo", url: "", size: 80, borderRadius: 10 })}
                  >
                    + Foto
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addBlock({ type: "contact", items: [] })}
                >
                  + Contato
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addBlock({ type: "social", items: [] })}
                >
                  + Social
                </Button>
                {canAddBanner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      addBlock({
                        type: "banner",
                        imageUrl: "",
                        linkUrl: "",
                        altText: "",
                      })
                    }
                  >
                    + Banner
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addBlock({ type: "divider", color: config.style.primaryColor })}
                >
                  + Divisor
                </Button>
              </div>
            </div>

            {config.blocks.map((block, i) => (
              <BlockEditor
                key={`${block.type}-${i}`}
                block={block}
                index={i}
                total={config.blocks.length}
                onUpdate={(b) => updateBlock(i, b)}
                onRemove={() => removeBlock(i)}
                onMove={(dir) => moveBlock(i, dir)}
              />
            ))}

            {config.blocks.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Adicione blocos acima para montar sua assinatura
              </p>
            )}
          </div>
        </Card>

        <Card variant="solid" padding="default">
          <StyleControls
            style={config.style}
            onChange={(style) => {
              setConfig((prev) => ({ ...prev, style }));
              setSaved(false);
            }}
          />
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar assinatura"}
          </Button>
          {saved && <span className="text-accent-light text-sm">Assinatura salva!</span>}
          {error && <span className="text-destructive text-sm">{error}</span>}
        </div>
      </div>

      {/* Preview column */}
      <div className="flex flex-col gap-4">
        <Card variant="solid" padding="default">
          <h3 className="text-foreground mb-3 text-sm font-semibold">Preview</h3>
          <SignaturePreview config={config} />
        </Card>
      </div>
    </div>
  );
}

type BlockEditorProps = {
  block: SignatureBlock;
  index: number;
  total: number;
  onUpdate: (block: SignatureBlock) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
};

function BlockEditor({ block, index, total, onUpdate, onRemove, onMove }: BlockEditorProps) {
  const header = (label: string) => (
    <div className="border-divider-strong flex items-center justify-between border-b pb-2">
      <span className="text-foreground text-xs font-medium">{label}</span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="h-6 px-1.5 text-xs"
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="h-6 px-1.5 text-xs"
        >
          ↓
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive h-6 px-1.5 text-xs"
        >
          ✕
        </Button>
      </div>
    </div>
  );

  switch (block.type) {
    case "photo":
      return (
        <div className="bg-surface-1 flex flex-col gap-2 rounded-md p-3">
          {header("Foto")}
          <PhotoEditor block={block} onUpdate={onUpdate} />
        </div>
      );
    case "info":
      return (
        <div className="bg-surface-1 flex flex-col gap-2 rounded-md p-3">
          {header("Informações")}
          <InfoEditor block={block} onUpdate={onUpdate} />
        </div>
      );
    case "contact":
      return (
        <div className="bg-surface-1 flex flex-col gap-2 rounded-md p-3">
          {header("Contato")}
          <ContactEditor block={block} onUpdate={onUpdate} />
        </div>
      );
    case "social":
      return (
        <div className="bg-surface-1 flex flex-col gap-2 rounded-md p-3">
          {header("Redes sociais")}
          <SocialEditor block={block} onUpdate={onUpdate} />
        </div>
      );
    case "banner":
      return (
        <div className="bg-surface-1 flex flex-col gap-2 rounded-md p-3">
          {header("Banner")}
          <BannerEditor block={block} onUpdate={onUpdate} />
        </div>
      );
    case "divider":
      return (
        <div className="bg-surface-1 flex flex-col gap-2 rounded-md p-3">
          {header("Divisor")}
          <DividerEditor block={block} onUpdate={onUpdate} />
        </div>
      );
  }
}
