"use server";

import { hashPassword } from "@/lib/auth/argon2";
import { prismaAdmin } from "@/lib/db/admin-client";
import { createTenantWithOwnerInTx } from "@/lib/onboarding/create-tenant";
import { actionClient } from "@/lib/safe-action";
import { recordSecurityEvent, recordSecurityEventInTx } from "@/lib/security/event";

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
        const tenant = await createTenantWithOwnerInTx(tx, {
          accountId: account.id,
          nomeTenant: parsedInput.nomeTenant,
          locale: parsedInput.locale,
        });
        await recordSecurityEventInTx(tx, {
          severity: "info",
          category: "authn",
          eventType: "signup_success",
          accountId: account.id,
          tenantId: tenant.id,
          metadata: { email: parsedInput.email, tenantName: parsedInput.nomeTenant },
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
