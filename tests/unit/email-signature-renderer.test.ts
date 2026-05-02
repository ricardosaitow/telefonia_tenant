import { describe, expect, it } from "vitest";

import {
  renderCompactHtml,
  renderCompactText,
  renderSignatureHtml,
  renderSignatureText,
} from "@/features/email-signature/renderer";
import type { SignatureConfig } from "@/features/email-signature/types";

const BASE_STYLE = {
  primaryColor: "#6366f1",
  textColor: "#333333",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 14,
} as const;

describe("renderSignatureHtml", () => {
  it("returns empty string for empty blocks", () => {
    const config: SignatureConfig = { blocks: [], style: BASE_STYLE };
    expect(renderSignatureHtml(config)).toBe("");
  });

  it("produces <table> based HTML without class= attributes", () => {
    const config: SignatureConfig = {
      blocks: [
        {
          type: "info",
          name: "John Doe",
          jobTitle: "Engineer",
          company: "Acme",
          department: "R&D",
        },
      ],
      style: BASE_STYLE,
    };
    const html = renderSignatureHtml(config);
    expect(html).toContain("<table");
    expect(html).not.toContain("class=");
    expect(html).toContain("style=");
    expect(html).toContain("John Doe");
    expect(html).toContain("Engineer");
    expect(html).toContain("Acme");
    expect(html).toContain("R&amp;D");
  });

  it("uses inline styles, not CSS classes", () => {
    const config: SignatureConfig = {
      blocks: [{ type: "divider", color: "#cccccc" }],
      style: BASE_STYLE,
    };
    const html = renderSignatureHtml(config);
    expect(html).toContain("border-top:1px solid #cccccc");
    expect(html).not.toContain("class=");
  });

  it("renders contact block with links", () => {
    const config: SignatureConfig = {
      blocks: [
        {
          type: "contact",
          items: [
            { contactType: "phone", value: "+5511999999999" },
            { contactType: "email", value: "john@acme.com" },
            { contactType: "website", value: "https://acme.com" },
          ],
        },
      ],
      style: BASE_STYLE,
    };
    const html = renderSignatureHtml(config);
    expect(html).toContain("mailto:john@acme.com");
    expect(html).toContain("tel:+5511999999999");
    expect(html).toContain("https://acme.com");
  });

  it("renders photo block with img tag", () => {
    const config: SignatureConfig = {
      blocks: [
        { type: "photo", url: "/api/signature-images/test.png", size: 80, borderRadius: 10 },
      ],
      style: BASE_STYLE,
    };
    const html = renderSignatureHtml(config);
    expect(html).toContain("<img");
    expect(html).toContain('width="80"');
    expect(html).toContain("border-radius:10%");
  });

  it("renders social block with icon images", () => {
    const config: SignatureConfig = {
      blocks: [
        {
          type: "social",
          items: [
            { platform: "linkedin", url: "https://linkedin.com/in/john" },
            { platform: "github", url: "https://github.com/john" },
          ],
        },
      ],
      style: BASE_STYLE,
    };
    const html = renderSignatureHtml(config);
    expect(html).toContain("/social-icons/linkedin.png");
    expect(html).toContain("/social-icons/github.png");
    expect(html).toContain("https://linkedin.com/in/john");
  });

  it("renders banner block", () => {
    const config: SignatureConfig = {
      blocks: [
        {
          type: "banner",
          imageUrl: "/api/signature-images/banner.png",
          linkUrl: "https://acme.com/promo",
          altText: "Promo banner",
        },
      ],
      style: BASE_STYLE,
    };
    const html = renderSignatureHtml(config);
    expect(html).toContain("Promo banner");
    expect(html).toContain("https://acme.com/promo");
  });

  it("escapes HTML special characters", () => {
    const config: SignatureConfig = {
      blocks: [
        {
          type: "info",
          name: "<script>alert(1)</script>",
          jobTitle: "A & B",
          company: "",
          department: "",
        },
      ],
      style: BASE_STYLE,
    };
    const html = renderSignatureHtml(config);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B");
  });

  it("applies style font family and size", () => {
    const config: SignatureConfig = {
      blocks: [{ type: "info", name: "Test", jobTitle: "", company: "", department: "" }],
      style: { ...BASE_STYLE, fontFamily: "Georgia, serif", fontSize: 16 },
    };
    const html = renderSignatureHtml(config);
    expect(html).toContain("Georgia, serif");
    expect(html).toContain("font-size:18px"); // name is fontSize + 2
  });
});

describe("renderSignatureText", () => {
  it("returns empty string for empty blocks", () => {
    const config: SignatureConfig = { blocks: [], style: BASE_STYLE };
    expect(renderSignatureText(config)).toBe("");
  });

  it("renders info block as text lines", () => {
    const config: SignatureConfig = {
      blocks: [
        {
          type: "info",
          name: "John Doe",
          jobTitle: "Engineer",
          company: "Acme",
          department: "R&D",
        },
      ],
      style: BASE_STYLE,
    };
    const text = renderSignatureText(config);
    expect(text).toContain("John Doe");
    expect(text).toContain("Engineer");
    expect(text).toContain("Acme · R&D");
  });

  it("renders contact items with labels", () => {
    const config: SignatureConfig = {
      blocks: [
        {
          type: "contact",
          items: [
            { contactType: "phone", value: "+55 11 99999" },
            { contactType: "email", value: "john@test.com" },
          ],
        },
      ],
      style: BASE_STYLE,
    };
    const text = renderSignatureText(config);
    expect(text).toContain("Tel: +55 11 99999");
    expect(text).toContain("Email: john@test.com");
  });

  it("renders divider as ---", () => {
    const config: SignatureConfig = {
      blocks: [{ type: "divider", color: "#cccccc" }],
      style: BASE_STYLE,
    };
    expect(renderSignatureText(config)).toBe("---");
  });
});

describe("renderCompactText", () => {
  it("returns -- name format", () => {
    const config: SignatureConfig = {
      blocks: [{ type: "info", name: "Maria Silva", jobTitle: "CEO", company: "", department: "" }],
      style: BASE_STYLE,
    };
    expect(renderCompactText(config)).toBe("-- \nMaria Silva");
  });

  it("returns empty string if no info block", () => {
    const config: SignatureConfig = {
      blocks: [{ type: "divider", color: "#ccc" }],
      style: BASE_STYLE,
    };
    expect(renderCompactText(config)).toBe("");
  });
});

describe("renderCompactHtml", () => {
  it("returns <p> with -- and name", () => {
    const config: SignatureConfig = {
      blocks: [{ type: "info", name: "Maria Silva", jobTitle: "", company: "", department: "" }],
      style: BASE_STYLE,
    };
    const html = renderCompactHtml(config);
    expect(html).toContain("--<br />");
    expect(html).toContain("Maria Silva");
    expect(html).toContain("<p");
  });
});
