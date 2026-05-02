"use server";

import { parseWithZod } from "@conform-to/zod";

import { generateToken, hashToken } from "@/lib/auth/tokens";
import { prismaAdmin } from "@/lib/db/admin-client";
import { sendEmail } from "@/lib/email/send";
import { ResetPasswordEmail } from "@/lib/email/templates/reset-password";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

import { forgotPasswordSchema } from "./schemas";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Gera token de reset de senha e envia por email.
 *
 * Anti-enumeração: SEMPRE retorna sucesso, mesmo se email não existe.
 * Rate limit: 3/hr por email.
 */
export async function forgotPasswordAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: forgotPasswordSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const { email } = submission.value;

  // Rate limit por email — 3/hr (seguranca.md §5.5).
  const rl = await checkRateLimit({
    key: `reset:${email}`,
    limit: RATE_LIMITS.PASSWORD_RESET.limit,
    windowSec: RATE_LIMITS.PASSWORD_RESET.windowSec,
  });
  if (!rl.ok) {
    // Anti-enumeração: retorna sucesso mesmo no rate limit.
    return submission.reply();
  }

  const account = await prismaAdmin.account.findUnique({
    where: { email },
    select: { id: true, nome: true, email: true },
  });

  if (account) {
    // Invalida tokens anteriores não usados.
    await prismaAdmin.passwordResetToken.updateMany({
      where: { accountId: account.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = generateToken();
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prismaAdmin.passwordResetToken.create({
      data: {
        accountId: account.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password/${encodeURIComponent(raw)}`;

    void sendEmail({
      to: account.email,
      subject: "Redefinir senha — telefonia.ia",
      react: ResetPasswordEmail({ nome: account.nome, resetUrl }),
      tags: [{ name: "category", value: "password-reset" }],
    });
  }

  // Sempre sucesso — anti-enumeração.
  return submission.reply();
}
