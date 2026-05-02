"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/argon2";
import { hashToken } from "@/lib/auth/tokens";
import { prismaAdmin } from "@/lib/db/admin-client";
import { sendEmail } from "@/lib/email/send";
import { PasswordChangedEmail } from "@/lib/email/templates/password-changed";
import { recordSecurityEventInTx } from "@/lib/security/event";

import { resetPasswordSchema } from "./schemas";

/**
 * Valida token de reset, troca senha e grava SecurityEvent.
 */
export async function resetPasswordAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: resetPasswordSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const { token: rawToken, password } = submission.value;
  const tokenHash = hashToken(rawToken);

  const resetToken = await prismaAdmin.passwordResetToken.findFirst({
    where: { tokenHash },
    include: { account: { select: { id: true, nome: true, email: true } } },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return submission.reply({
      formErrors: ["Link expirado ou inválido. Solicite um novo."],
    });
  }

  const passwordHash = await hashPassword(password);

  await prismaAdmin.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: resetToken.accountId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await recordSecurityEventInTx(tx, {
      severity: "info",
      category: "authn",
      eventType: "password_reset_success",
      accountId: resetToken.accountId,
      metadata: { email: resetToken.account.email },
    });
  });

  void sendEmail({
    to: resetToken.account.email,
    subject: "Senha alterada — telefonia.ia",
    react: PasswordChangedEmail({ nome: resetToken.account.nome }),
    tags: [{ name: "category", value: "password-changed" }],
  });

  redirect("/login?reset=ok");
}
