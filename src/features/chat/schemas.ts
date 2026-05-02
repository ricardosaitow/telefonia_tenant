import { z } from "zod";

// ---------- Chat CRUD ----------

export const createInternalChatSchema = z.object({
  titulo: z.string().min(1).max(200).trim().optional(),
  /** Membership IDs of participants (creator is added automatically). */
  participantIds: z.array(z.string().uuid()).min(1).max(100),
});
export type CreateInternalChatInput = z.infer<typeof createInternalChatSchema>;

// ---------- Messages ----------

export const sendMessageSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().min(1).max(10_000).trim(),
  tipo: z
    .enum(["text", "image", "audio", "video", "document", "location", "contact", "voice_note"])
    .default("text"),
  quotedMessageId: z.string().uuid().optional(),
  // Media (optional)
  mediaUrl: z.string().url().optional(),
  mediaName: z.string().max(500).optional(),
  mediaMimeType: z.string().max(200).optional(),
  mediaSize: z.number().int().positive().optional(),
  // Location (optional)
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationName: z.string().max(500).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ---------- Assignment ----------

export const assignChatSchema = z.object({
  chatId: z.string().uuid(),
  assignedToId: z.string().uuid(),
});
export type AssignChatInput = z.infer<typeof assignChatSchema>;

// ---------- Transfer ----------

export const transferChatSchema = z.object({
  chatId: z.string().uuid(),
  departmentId: z.string().uuid(),
});
export type TransferChatInput = z.infer<typeof transferChatSchema>;

// ---------- Finish ----------

export const finishChatSchema = z.object({
  chatId: z.string().uuid(),
});
export type FinishChatInput = z.infer<typeof finishChatSchema>;

// ---------- Reopen ----------

export const reopenChatSchema = z.object({
  chatId: z.string().uuid(),
});
export type ReopenChatInput = z.infer<typeof reopenChatSchema>;

// ---------- Mark read ----------

export const markReadSchema = z.object({
  chatId: z.string().uuid(),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;

// ---------- Notes ----------

export const addNoteSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().min(1).max(5_000).trim(),
});
export type AddNoteInput = z.infer<typeof addNoteSchema>;

// ---------- Participants ----------

export const addParticipantSchema = z.object({
  chatId: z.string().uuid(),
  membershipId: z.string().uuid(),
  isAdmin: z.boolean().default(false),
});
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

export const removeParticipantSchema = z.object({
  chatId: z.string().uuid(),
  membershipId: z.string().uuid(),
});
export type RemoveParticipantInput = z.infer<typeof removeParticipantSchema>;

// ---------- Update chat ----------

export const updateChatSchema = z.object({
  chatId: z.string().uuid(),
  titulo: z.string().min(1).max(200).trim().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  blocked: z.boolean().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});
export type UpdateChatInput = z.infer<typeof updateChatSchema>;

// ---------- Delete (soft, per user) ----------

export const deleteChatSchema = z.object({
  chatId: z.string().uuid(),
});
export type DeleteChatInput = z.infer<typeof deleteChatSchema>;

// ---------- Typing ----------

export const typingSchema = z.object({
  chatId: z.string().uuid(),
});
export type TypingInput = z.infer<typeof typingSchema>;
