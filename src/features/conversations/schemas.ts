import { z } from "zod";

export const replyEmailSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(10000).trim(),
});

export type ReplyEmailInput = z.infer<typeof replyEmailSchema>;
