"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth/config";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/security/client-info";
import { recordSecurityEvent } from "@/lib/security/event";

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

  // Rate limit por IP — 10/min (seguranca.md §5.5).
  const ip = await getClientIp();
  const ua = await getUserAgent();
  const rl = await checkRateLimit({
    key: `login:${ip}`,
    limit: RATE_LIMITS.LOGIN.limit,
    windowSec: RATE_LIMITS.LOGIN.windowSec,
  });
  if (!rl.ok) {
    void recordSecurityEvent({
      severity: "high",
      category: "rate_limit",
      eventType: "login_rate_limited",
      description: `Excedeu ${RATE_LIMITS.LOGIN.limit} tentativas/min`,
      ipAddress: ip,
      userAgent: ua,
      metadata: { email: submission.value.email },
    });
    return submission.reply({
      formErrors: [`Muitas tentativas. Aguarde ${rl.resetSec}s.`],
    });
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

  // Preservar redirect `next` pra fluxos como aceitar convite.
  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/")) {
    redirect(next);
  }

  redirect("/tenants");
}
