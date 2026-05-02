"use client";

import type {
  BannerBlock,
  ContactBlock,
  DividerBlock,
  InfoBlock,
  PhotoBlock,
  SignatureBlock,
  SignatureConfig,
  SignatureStyle,
  SocialBlock,
} from "@/features/email-signature/types";

type Props = {
  config: SignatureConfig;
};

/**
 * Live preview rendering signature config directly as React elements
 * with inline style props. No HTML string intermediary.
 */
export function SignaturePreview({ config }: Props) {
  const { style } = config;

  if (config.blocks.length === 0) {
    return (
      <div
        style={{ background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb", padding: 12 }}
      >
        <p style={{ color: "#999", fontSize: 13 }}>Nenhum bloco adicionado</p>
      </div>
    );
  }

  return (
    <div>
      {/* Debug: mostra valores atuais das cores */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
          fontSize: 11,
          fontFamily: "monospace",
          color: "#666",
        }}
      >
        <span>
          primária:{" "}
          <span style={{ color: style.primaryColor, fontWeight: "bold" }}>
            {style.primaryColor}
          </span>
        </span>
        <span>
          texto:{" "}
          <span style={{ color: style.textColor, fontWeight: "bold" }}>{style.textColor}</span>
        </span>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 6,
          border: "1px solid #e5e7eb",
          padding: 12,
          fontFamily: style.fontFamily,
          fontSize: `${style.fontSize}px`,
          color: style.textColor,
        }}
      >
        {config.blocks.map((block, i) => (
          <BlockPreview key={`${block.type}-${i}`} block={block} style={style} />
        ))}
      </div>
    </div>
  );
}

function BlockPreview({ block, style }: { block: SignatureBlock; style: SignatureStyle }) {
  switch (block.type) {
    case "photo":
      return <PhotoPreview block={block} />;
    case "info":
      return <InfoPreview block={block} style={style} />;
    case "contact":
      return <ContactPreview block={block} style={style} />;
    case "social":
      return <SocialPreview block={block} />;
    case "banner":
      return <BannerPreview block={block} />;
    case "divider":
      return <DividerPreview block={block} />;
  }
}

function PhotoPreview({ block }: { block: PhotoBlock }) {
  if (!block.url) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.url}
        alt="Photo"
        width={block.size}
        height={block.size}
        style={{
          display: "block",
          width: `${block.size}px`,
          maxWidth: `${block.size}px`,
          height: `${block.size}px`,
          borderRadius: `${block.borderRadius}%`,
          objectFit: "cover",
        }}
      />
    </div>
  );
}

function InfoPreview({ block, style }: { block: InfoBlock; style: SignatureStyle }) {
  if (!block.name && !block.jobTitle && !block.company && !block.department) return null;
  return (
    <div style={{ marginBottom: 8, lineHeight: 1.5, fontFamily: style.fontFamily }}>
      {block.name && (
        <div
          style={{
            fontSize: `${style.fontSize + 2}px`,
            fontWeight: "bold",
            color: style.textColor,
          }}
        >
          {block.name}
        </div>
      )}
      {block.jobTitle && (
        <div style={{ fontSize: `${style.fontSize}px`, color: style.primaryColor }}>
          {block.jobTitle}
        </div>
      )}
      {(block.company || block.department) && (
        <div style={{ fontSize: `${style.fontSize - 1}px`, color: style.textColor }}>
          {[block.company, block.department].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

const CONTACT_LABELS: Record<string, string> = {
  phone: "Tel",
  email: "Email",
  website: "Web",
};

function ContactPreview({ block, style }: { block: ContactBlock; style: SignatureStyle }) {
  if (block.items.length === 0) return null;
  return (
    <div style={{ marginBottom: 8, fontFamily: style.fontFamily }}>
      {block.items.map((item, i) => {
        const label = CONTACT_LABELS[item.contactType] ?? item.contactType;
        return (
          <div
            key={i}
            style={{
              fontSize: `${style.fontSize - 1}px`,
              marginBottom: 2,
              display: "flex",
              gap: 8,
            }}
          >
            <span style={{ color: style.textColor, whiteSpace: "nowrap" }}>{label}:</span>
            <span style={{ color: style.primaryColor }}>{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function SocialPreview({ block }: { block: SocialBlock }) {
  if (block.items.length === 0) return null;
  return (
    <div
      style={{ marginBottom: 8, display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 6 }}
    >
      {block.items.map((item, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={`/social-icons/${item.platform}.png`}
          alt={item.platform}
          width={20}
          height={20}
          style={{ display: "inline-block", width: "20px", maxWidth: "20px", height: "20px" }}
        />
      ))}
    </div>
  );
}

function BannerPreview({ block }: { block: BannerBlock }) {
  if (!block.imageUrl) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.imageUrl}
        alt={block.altText || "Banner"}
        style={{ display: "block", maxWidth: 500, height: "auto" }}
      />
    </div>
  );
}

function DividerPreview({ block }: { block: DividerBlock }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <hr style={{ border: "none", borderTop: `1px solid ${block.color}`, margin: 0 }} />
    </div>
  );
}
