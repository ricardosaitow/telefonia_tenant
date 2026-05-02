// Block-based email signature config types.
// Used client-side (editor) and server-side (renderer + save action).

export type ContactType = "phone" | "email" | "website";

export type SocialPlatform =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "twitter"
  | "youtube"
  | "github"
  | "tiktok";

export interface PhotoBlock {
  type: "photo";
  url: string;
  size: number; // 40-200px
  borderRadius: number; // 0-50%
}

export interface InfoBlock {
  type: "info";
  name: string;
  jobTitle: string;
  company: string;
  department: string;
}

export interface ContactItem {
  contactType: ContactType;
  value: string;
}

export interface ContactBlock {
  type: "contact";
  items: ContactItem[];
}

export interface SocialItem {
  platform: SocialPlatform;
  url: string;
}

export interface SocialBlock {
  type: "social";
  items: SocialItem[];
}

export interface BannerBlock {
  type: "banner";
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

export interface DividerBlock {
  type: "divider";
  color: string; // hex color
}

export type SignatureBlock =
  | PhotoBlock
  | InfoBlock
  | ContactBlock
  | SocialBlock
  | BannerBlock
  | DividerBlock;

export interface SignatureStyle {
  primaryColor: string; // hex
  textColor: string; // hex
  fontFamily: string; // email-safe font
  fontSize: number; // 12-18px
}

export interface SignatureConfig {
  blocks: SignatureBlock[];
  style: SignatureStyle;
}

export const EMAIL_SAFE_FONTS = [
  "Arial, Helvetica, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "Verdana, Geneva, sans-serif",
  "Tahoma, Geneva, sans-serif",
  "'Trebuchet MS', Helvetica, sans-serif",
  "'Courier New', Courier, monospace",
] as const;

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
  { value: "github", label: "GitHub" },
  { value: "tiktok", label: "TikTok" },
];

export const DEFAULT_SIGNATURE_CONFIG: SignatureConfig = {
  blocks: [
    {
      type: "info",
      name: "",
      jobTitle: "",
      company: "",
      department: "",
    },
    {
      type: "contact",
      items: [],
    },
  ],
  style: {
    primaryColor: "#6366f1",
    textColor: "#333333",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 14,
  },
};
