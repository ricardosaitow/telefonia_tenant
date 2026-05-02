"use server";

import { hashPassword } from "@/lib/auth/argon2";
import { prismaAdmin } from "@/lib/db/admin-client";
import { actionClient } from "@/lib/safe-action";
import { recordSecurityEvent, recordSecurityEventInTx } from "@/lib/security/event";

import { signupSchema } from "./schemas";

/**
 * Signup — cria apenas Account. Tenant é criado na escolha de plano
 * (/choose-plan) após login.
 *
 * - Account é global (D004).
 * - Não retorna info que diferencie "email já existe" de outras falhas
 *   (anti-enumeration). P2002 → silently ok.
 *
 * Não faz auto-login. Após signup, redireciona pra /login (em signupFormAction).
 *
 * Este módulo NÃO importa nada de NextAuth — testável em vitest puro.
 */
export const signupAction = actionClient
  .inputSchema(signupSchema)
  .action(async ({ parsedInput }) => {
    const passwordHash = await hashPassword(parsedInput.password);

    try {
      await prismaAdmin.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            email: parsedInput.email,
            passwordHash,
            nome: parsedInput.nome,
            locale: parsedInput.locale,
          },
        });
        await recordSecurityEventInTx(tx, {
          severity: "info",
          category: "authn",
          eventType: "signup_success",
          accountId: account.id,
          metadata: { email: parsedInput.email },
        });
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        // Email duplicado — registra como fire-and-forget (fora da TX que abortou).
        void recordSecurityEvent({
          severity: "low",
          category: "authn",
          eventType: "signup_duplicate",
          description: "Tentativa de signup com email já existente",
          metadata: { email: parsedInput.email },
        });
        return { ok: true as const };
      }
      throw err;
    }

    return { ok: true as const };
  });
