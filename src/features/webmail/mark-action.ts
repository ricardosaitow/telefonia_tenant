"use server";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { markReadSchema, moveToFolderSchema, toggleImportantSchema } from "./schemas";

export const markAsRead = actionClient.schema(markReadSchema).action(async ({ parsedInput }) => {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  return withTenantContext(ctx.activeTenantId, async (tx) => {
    const email = await tx.emailMessage.findUnique({
      where: { id: parsedInput.emailId },
      select: { id: true, folderId: true, channelId: true, isRead: true },
    });
    if (!email) throw new Error("Email não encontrado.");

    if (email.isRead !== parsedInput.read) {
      await tx.emailMessage.update({
        where: { id: parsedInput.emailId },
        data: { isRead: parsedInput.read },
      });

      // Update folder unread count
      const delta = parsedInput.read ? -1 : 1;
      await tx.emailFolder.update({
        where: { id: email.folderId },
        data: { unreadEmails: { increment: delta } },
      });
    }

    return { ok: true };
  });
});

export const toggleImportant = actionClient
  .schema(toggleImportantSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "email:view");

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const email = await tx.emailMessage.findUnique({
        where: { id: parsedInput.emailId },
        select: { id: true, isImportant: true },
      });
      if (!email) throw new Error("Email não encontrado.");

      await tx.emailMessage.update({
        where: { id: parsedInput.emailId },
        data: { isImportant: !email.isImportant },
      });

      return { ok: true };
    });
  });

export const moveToFolder = actionClient
  .schema(moveToFolderSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "email:view");

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const email = await tx.emailMessage.findUnique({
        where: { id: parsedInput.emailId },
        select: { id: true, folderId: true, channelId: true, isRead: true },
      });
      if (!email) throw new Error("Email não encontrado.");

      if (email.folderId === parsedInput.folderId) return { ok: true };

      const oldFolderId = email.folderId;

      await tx.emailMessage.update({
        where: { id: parsedInput.emailId },
        data: { folderId: parsedInput.folderId },
      });

      // Update folder counts
      await tx.emailFolder.update({
        where: { id: oldFolderId },
        data: {
          totalEmails: { decrement: 1 },
          ...(email.isRead ? {} : { unreadEmails: { decrement: 1 } }),
        },
      });
      await tx.emailFolder.update({
        where: { id: parsedInput.folderId },
        data: {
          totalEmails: { increment: 1 },
          ...(email.isRead ? {} : { unreadEmails: { increment: 1 } }),
        },
      });

      return { ok: true };
    });
  });
