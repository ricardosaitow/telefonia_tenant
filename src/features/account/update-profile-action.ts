"use server";

import { parseWithZod } from "@conform-to/zod";
import { revalidatePath } from "next/cache";

import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSession } from "@/lib/rbac";
import { recordSecurityEvent } from "@/lib/security/event";

import { accountProfileInputSchema } from "./schemas";

/**
 * Atualiza nome + locale da própria Account. Não usa AuditLog (Account é
 * global, AuditLog é tenant-scoped). Em vez disso registra SecurityEvent
 * `profile_updated` (categoria authn — mudança em credencial-adjacente).
 */
export async function updateAccountProfileAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: accountProfileInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSession();

  const before = await prismaAdmin.account.findUnique({
    where: { id: ctx.account.id },
    select: { nome: true, locale: true },
  });
  if (!before) {
    return submission.reply({ formErrors: ["Conta não encontrada."] });
  }

  await prismaAdmin.account.update({
    where: { id: ctx.account.id },
    data: {
      nome: submission.value.nome,
      locale: submission.value.locale,
    },
  });

  void recordSecurityEvent({
    severity: "info",
    category: "config_change",
    eventType: "profile_updated",
    accountId: ctx.account.id,
    metadata: {
      before: { nome: before.nome, locale: before.locale },
      after: { nome: submission.value.nome, locale: submission.value.locale },
    },
  });

  revalidatePath("/account");
  return submission.reply({ resetForm: false });
}
