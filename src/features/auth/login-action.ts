"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth/config";

import { signinSchema } from "./schemas";

/**
 * Login via NextAuth `signIn("credentials", ...)`.
 *
 * - Conform format: recebe (prevState, formData), devolve `submission.reply()`
 *   com erros pra UI rehidratar campos.
 * - Erros do NextAuth (CredentialsSignin etc) viram mensagem genérica única
 *   pra evitar enumeration (docs/seguranca.md §5.5).
 * - Sucesso: redirect("/tenants") FORA do try/catch — `redirect()` do Next
 *   joga NEXT_REDIRECT que precisa propagar pro framework, não capturado.
 */
export async function loginAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: signinSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  try {
    await signIn("credentials", {
      email: submission.value.email,
      password: submission.value.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return submission.reply({
        formErrors: ["Email ou senha incorretos."],
      });
    }
    throw error;
  }

  redirect("/tenants");
}
