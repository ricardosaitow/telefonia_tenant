"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/argon2";
import { prisma } from "@/lib/db/client";

import { signupSchema } from "./schemas";

/**
 * Versão Conform do signupAction: recebe (prevState, formData), parsea com
 * Zod via Conform e replica erros pro form. Convive com `signupAction`
 * (next-safe-action) — esta é a versão pra forms HTML5, aquela é pra chamada
 * programática (test/integration).
 *
 * Não revela "email já existe" — em caso de P2002 redireciona pra /login com
 * flag, igualando o caminho feliz (mitiga enumeration via mensagem).
 */
export async function signupFormAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: signupSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const passwordHash = await hashPassword(submission.value.password);

  try {
    await prisma.account.create({
      data: {
        email: submission.value.email,
        passwordHash,
        nome: submission.value.nome,
        locale: submission.value.locale,
      },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      // Caminho feliz: redireciona igual ao sucesso pra não vazar conflito.
      redirect("/login?signup=ok");
    }
    throw err;
  }

  redirect("/login?signup=ok");
}
