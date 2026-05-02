import { z } from "zod";

export const createQuickReplySchema = z.object({
  title: z.string().min(1).max(200).trim(),
  shortcut: z
    .string()
    .min(1)
    .max(50)
    .trim()
    .refine((v) => v.startsWith("/"), { message: "Atalho deve começar com /" }),
  content: z.string().min(1).max(5_000).trim(),
  mediaUrl: z.string().url().optional(),
  mediaMimeType: z.string().max(200).optional(),
  departmentId: z.string().uuid().optional(),
});
export type CreateQuickReplyInput = z.infer<typeof createQuickReplySchema>;

export const updateQuickReplySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).trim().optional(),
  shortcut: z
    .string()
    .min(1)
    .max(50)
    .trim()
    .refine((v) => v.startsWith("/"), { message: "Atalho deve começar com /" })
    .optional(),
  content: z.string().min(1).max(5_000).trim().optional(),
  mediaUrl: z.string().url().nullable().optional(),
  mediaMimeType: z.string().max(200).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});
export type UpdateQuickReplyInput = z.infer<typeof updateQuickReplySchema>;

export const deleteQuickReplySchema = z.object({
  id: z.string().uuid(),
});
export type DeleteQuickReplyInput = z.infer<typeof deleteQuickReplySchema>;
