import { z } from "zod";

export const markReadSchema = z.object({
  emailId: z.string().uuid(),
  read: z.boolean(),
});

export const toggleImportantSchema = z.object({
  emailId: z.string().uuid(),
});

export const moveToFolderSchema = z.object({
  emailId: z.string().uuid(),
  folderId: z.string().uuid(),
});

export const deleteEmailSchema = z.object({
  emailId: z.string().uuid(),
});

export const syncChannelSchema = z.object({
  channelId: z.string().uuid(),
});
