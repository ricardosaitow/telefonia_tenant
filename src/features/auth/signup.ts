"use server";

import { hashPassword } from "@/lib/auth/argon2";
import { prisma } from "@/lib/db/client";
import { actionClient } from "@/lib/safe-action";

import { signupSchema } from "./schemas";

/**
 * Signup — cria Account global (D004). NÃO faz auto-login: signin é fluxo
 * separado via NextAuth `signIn("credentials", ...)` (vem em 8b com a UI).
 *
 * Este módulo deliberadamente NÃO importa nada de NextAuth — assim pode ser
 * testado em ambiente Node puro (Vitest) sem precisar resolver `next/server`.
 *
 * NÃO retorna info que distinga "email já existe" de outras falhas (evita
 * enumeration — docs/seguranca.md §5.5).
 */
export const signupAction = actionClient
  .inputSchema(signupSchema)
  .action(async ({ parsedInput }) => {
    const passwordHash = await hashPassword(parsedInput.password);

    try {
      await prisma.account.create({
        data: {
          email: parsedInput.email,
          passwordHash,
          nome: parsedInput.nome,
          locale: parsedInput.locale,
        },
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
