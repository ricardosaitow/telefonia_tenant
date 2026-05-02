import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be hex color (#RRGGBB)");

const photoBlockSchema = z.object({
  type: z.literal("photo"),
  url: z.string(),
  size: z.coerce.number().int().min(40).max(200),
  borderRadius: z.coerce.number().min(0).max(50),
});

const infoBlockSchema = z.object({
  type: z.literal("info"),
  name: z.string().max(100),
  jobTitle: z.string().max(100),
  company: z.string().max(100),
  department: z.string().max(100),
});

const contactItemSchema = z.object({
  contactType: z.enum(["phone", "email", "website"]),
  value: z.string().max(200),
});

const contactBlockSchema = z.object({
  type: z.literal("contact"),
  items: z.array(contactItemSchema).max(10),
});

const socialItemSchema = z.object({
  platform: z.enum(["linkedin", "instagram", "facebook", "twitter", "youtube", "github", "tiktok"]),
  url: z.string().max(500),
});

const socialBlockSchema = z.object({
  type: z.literal("social"),
  items: z.array(socialItemSchema).max(7),
});

const bannerBlockSchema = z.object({
  type: z.literal("banner"),
  imageUrl: z.string(),
  linkUrl: z.string().max(500),
  altText: z.string().max(200),
});

const dividerBlockSchema = z.object({
  type: z.literal("divider"),
  color: hexColor,
});

const signatureBlockSchema = z.discriminatedUnion("type", [
  photoBlockSchema,
  infoBlockSchema,
  contactBlockSchema,
  socialBlockSchema,
  bannerBlockSchema,
  dividerBlockSchema,
]);

const signatureStyleSchema = z.object({
  primaryColor: hexColor,
  textColor: hexColor,
  fontFamily: z.string().min(1).max(200),
  fontSize: z.coerce.number().int().min(12).max(18),
});

export const signatureConfigSchema = z.object({
  blocks: z.array(signatureBlockSchema).max(20),
  style: signatureStyleSchema,
});

export const saveSignatureInputSchema = z.object({
  config: signatureConfigSchema,
});
