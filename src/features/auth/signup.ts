"use server";

import { hashPassword } from "@/lib/auth/argon2";
import { prismaAdmin } from "@/lib/db/admin-client";
import { createTenantWithOwnerInTx } from "@/lib/onboarding/create-tenant";
import { actionClient } from "@/lib/safe-action";

import { signupSchema } from "./schemas";

/**
 * Signup — cria Account + Tenant + Membership owner ATOMICAMENTE.
 *
 * - Account é global (D004); Tenant + Membership precisam de privilégio pra
 *   bypass RLS no INSERT. Por isso usa `prismaAdmin` — escopo restrito a este
 *   fluxo administrativo.
 * - Transação garante atomicidade.
 * - Não retorna info que diferencie "email já existe" de outras falhas
 *   (anti-enumeration). P2002 → silently ok, NENHUM tenant é criado pra email
 *   duplicado (a transação já abortou).
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
        await createTenantWithOwnerInTx(tx, {
          accountId: account.id,
          nomeTenant: parsedInput.nomeTenant,
          locale: parsedInput.locale,
        });
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return { ok: true as const };
      }
      throw err;
    }

    return { ok: true as const };
  });
