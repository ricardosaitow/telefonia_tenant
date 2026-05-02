"use server";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { actionClient } from "@/lib/safe-action";

import { deleteEmailSchema } from "./schemas";

/**
 * Delete email: if in trash, permanently delete. Otherwise move to trash.
 */
export const deleteEmail = actionClient
  .schema(deleteEmailSchema)
  .action(async ({ parsedInput }) => {
    const ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "email:view");

    return withTenantContext(ctx.activeTenantId, async (tx) => {
      const email = await tx.emailMessage.findUnique({
        where: { id: parsedInput.emailId },
        select: {
          id: true,
          folderId: true,
          channelId: true,
          isRead: true,
          folder: { select: { tipo: true } },
        },
      });
      if (!email) throw new Error("Email não encontrado.");

      if (email.folder.tipo === "trash") {
        // Permanent delete
        await tx.emailMessage.delete({ where: { id: parsedInput.emailId } });

        await tx.emailFolder.update({
          where: { id: email.folderId },
          data: {
            totalEmails: { decrement: 1 },
            ...(email.isRead ? {} : { unreadEmails: { decrement: 1 } }),
          },
        });

        return { ok: true, permanent: true };
      }

      // Move to trash
      const trashFolder = await tx.emailFolder.findFirst({
        where: { channelId: email.channelId, tipo: "trash" },
        select: { id: true },
      });
      if (!trashFolder) throw new Error("Pasta Lixeira não encontrada.");

      await tx.emailMessage.update({
        where: { id: parsedInput.emailId },
        data: { folderId: trashFolder.id },
      });

      // Update folder counts
      await tx.emailFolder.update({
        where: { id: email.folderId },
        data: {
          totalEmails: { decrement: 1 },
          ...(email.isRead ? {} : { unreadEmails: { decrement: 1 } }),
        },
      });
      await tx.emailFolder.update({
        where: { id: trashFolder.id },
        data: {
          totalEmails: { increment: 1 },
          ...(email.isRead ? {} : { unreadEmails: { increment: 1 } }),
        },
      });

      return { ok: true, permanent: false };
    });
  });
