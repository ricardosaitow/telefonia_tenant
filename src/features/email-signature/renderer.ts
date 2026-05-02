// Pure functions to render SignatureConfig → email-safe HTML (tables + inline styles)
// and plain-text fallback. No external deps, runs client + server.

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
} from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPhoto(block: PhotoBlock, style: SignatureStyle): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
  <tr>
    <td>
      <img src="${esc(block.url)}" width="${block.size}" height="${block.size}" alt="Photo" style="display:block;border-radius:${block.borderRadius}%;width:${block.size}px;height:${block.size}px;object-fit:cover;font-family:${esc(style.fontFamily)};" />
    </td>
  </tr>
</table>`;
}

function renderInfo(block: InfoBlock, style: SignatureStyle): string {
  const lines: string[] = [];
  if (block.name) {
    lines.push(
      `<span style="font-size:${style.fontSize + 2}px;font-weight:bold;color:${esc(style.textColor)};">${esc(block.name)}</span>`,
    );
  }
  if (block.jobTitle) {
    lines.push(
      `<span style="font-size:${style.fontSize}px;color:${esc(style.primaryColor)};">${esc(block.jobTitle)}</span>`,
    );
  }
  if (block.company || block.department) {
    const parts = [block.company, block.department].filter(Boolean).map(esc);
    lines.push(
      `<span style="font-size:${style.fontSize - 1}px;color:${esc(style.textColor)};">${parts.join(" · ")}</span>`,
    );
  }
  if (lines.length === 0) return "";
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
  <tr>
    <td style="font-family:${esc(style.fontFamily)};line-height:1.5;">
      ${lines.join("<br />")}
    </td>
  </tr>
</table>`;
}

const CONTACT_LABELS: Record<string, string> = {
  phone: "Tel",
  email: "Email",
  website: "Web",
};

function renderContact(block: ContactBlock, style: SignatureStyle): string {
  if (block.items.length === 0) return "";
  const rows = block.items
    .map((item) => {
      const label = CONTACT_LABELS[item.contactType] ?? item.contactType;
      let valueHtml: string;
      if (item.contactType === "email") {
        valueHtml = `<a href="mailto:${esc(item.value)}" style="color:${esc(style.primaryColor)};text-decoration:none;">${esc(item.value)}</a>`;
      } else if (item.contactType === "website") {
        valueHtml = `<a href="${esc(item.value)}" style="color:${esc(style.primaryColor)};text-decoration:none;">${esc(item.value)}</a>`;
      } else {
        valueHtml = `<a href="tel:${esc(item.value.replace(/\s/g, ""))}" style="color:${esc(style.primaryColor)};text-decoration:none;">${esc(item.value)}</a>`;
      }
      return `<tr>
    <td style="font-size:${style.fontSize - 1}px;color:${esc(style.textColor)};padding-right:8px;white-space:nowrap;font-family:${esc(style.fontFamily)};">${esc(label)}:</td>
    <td style="font-size:${style.fontSize - 1}px;font-family:${esc(style.fontFamily)};">${valueHtml}</td>
  </tr>`;
    })
    .join("\n");
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
  ${rows}
</table>`;
}

function renderSocial(block: SocialBlock): string {
  if (block.items.length === 0) return "";
  const cells = block.items
    .map(
      (item) =>
        `<td style="padding-right:6px;">
      <a href="${esc(item.url)}" style="text-decoration:none;" target="_blank" rel="noopener noreferrer">
        <img src="/social-icons/${item.platform}.png" width="20" height="20" alt="${esc(item.platform)}" style="display:block;width:20px;height:20px;" />
      </a>
    </td>`,
    )
    .join("\n");
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
  <tr>
    ${cells}
  </tr>
</table>`;
}

function renderBanner(block: BannerBlock): string {
  const img = `<img src="${esc(block.imageUrl)}" alt="${esc(block.altText)}" style="display:block;max-width:500px;height:auto;" />`;
  if (block.linkUrl) {
    return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
  <tr>
    <td>
      <a href="${esc(block.linkUrl)}" style="text-decoration:none;" target="_blank" rel="noopener noreferrer">${img}</a>
    </td>
  </tr>
</table>`;
  }
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
  <tr><td>${img}</td></tr>
</table>`;
}

function renderDivider(block: DividerBlock): string {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;">
  <tr>
    <td style="border-top:1px solid ${esc(block.color)};font-size:1px;line-height:1px;">&nbsp;</td>
  </tr>
</table>`;
}

function renderBlock(block: SignatureBlock, style: SignatureStyle): string {
  switch (block.type) {
    case "photo":
      return renderPhoto(block, style);
    case "info":
      return renderInfo(block, style);
    case "contact":
      return renderContact(block, style);
    case "social":
      return renderSocial(block);
    case "banner":
      return renderBanner(block);
    case "divider":
      return renderDivider(block);
  }
}

/**
 * Render signature config to email-safe HTML (tables + inline styles).
 * No <html>/<body> tags — designed to be injected into an email body.
 */
export function renderSignatureHtml(config: SignatureConfig): string {
  if (config.blocks.length === 0) return "";

  const blocksHtml = config.blocks
    .map((block) => renderBlock(block, config.style))
    .filter(Boolean)
    .join("\n");

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${esc(config.style.fontFamily)};font-size:${config.style.fontSize}px;color:${esc(config.style.textColor)};">
  <tr>
    <td>
      ${blocksHtml}
    </td>
  </tr>
</table>`;
}

/**
 * Render signature config to plain-text fallback.
 */
export function renderSignatureText(config: SignatureConfig): string {
  const lines: string[] = [];

  for (const block of config.blocks) {
    switch (block.type) {
      case "info": {
        if (block.name) lines.push(block.name);
        if (block.jobTitle) lines.push(block.jobTitle);
        if (block.company || block.department) {
          lines.push([block.company, block.department].filter(Boolean).join(" · "));
        }
        break;
      }
      case "contact": {
        for (const item of block.items) {
          const label = CONTACT_LABELS[item.contactType] ?? item.contactType;
          lines.push(`${label}: ${item.value}`);
        }
        break;
      }
      case "social": {
        for (const item of block.items) {
          lines.push(`${item.platform}: ${item.url}`);
        }
        break;
      }
      case "divider": {
        lines.push("---");
        break;
      }
      case "banner": {
        if (block.linkUrl) lines.push(block.linkUrl);
        break;
      }
      // photo: no text representation
    }
  }

  return lines.join("\n");
}

/**
 * Compact signature for reply: just "-- \nName"
 */
export function renderCompactText(config: SignatureConfig): string {
  const infoBlock = config.blocks.find((b) => b.type === "info");
  if (!infoBlock || infoBlock.type !== "info" || !infoBlock.name) return "";
  return `-- \n${infoBlock.name}`;
}

/**
 * Compact signature HTML for reply.
 */
export function renderCompactHtml(config: SignatureConfig): string {
  const infoBlock = config.blocks.find((b) => b.type === "info");
  if (!infoBlock || infoBlock.type !== "info" || !infoBlock.name) return "";
  return `<p style="color:#666;font-size:${config.style.fontSize}px;font-family:${esc(config.style.fontFamily)};">--<br />${esc(infoBlock.name)}</p>`;
}
