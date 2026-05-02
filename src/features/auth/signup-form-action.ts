"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/argon2";
import { prismaAdmin } from "@/lib/db/admin-client";
import { sendEmail } from "@/lib/email/send";
import { WelcomeEmail } from "@/lib/email/templates/welcome";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/security/client-info";
import { recordSecurityEvent, recordSecurityEventInTx } from "@/lib/security/event";

import { signupSchema } from "./schemas";

/**
 * Signup — cria apenas Account. Tenant é criado na escolha de plano
 * (/choose-plan) após login.
 *
 * P2002 (email duplicado) → silently redirect (anti-enumeration).
 */
export async function signupFormAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: signupSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ip = await getClientIp();
  const ua = await getUserAgent();
  const rl = await checkRateLimit({
    key: `signup:${ip}`,
    limit: RATE_LIMITS.SIGNUP.limit,
    windowSec: RATE_LIMITS.SIGNUP.windowSec,
  });
  if (!rl.ok) {
    void recordSecurityEvent({
      severity: "high",
      category: "rate_limit",
      eventType: "signup_rate_limited",
      description: `Excedeu ${RATE_LIMITS.SIGNUP.limit} signups/min`,
      ipAddress: ip,
      userAgent: ua,
    });
    return submission.reply({
      formErrors: [`Muitas tentativas de cadastro. Aguarde ${rl.resetSec}s.`],
    });
  }

  const passwordHash = await hashPassword(submission.value.password);

  try {
    await prismaAdmin.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          email: submission.value.email,
          passwordHash,
          nome: submission.value.nome,
          locale: submission.value.locale,
        },
      });
      await recordSecurityEventInTx(tx, {
        severity: "info",
        category: "authn",
        eventType: "signup_success",
        accountId: account.id,
        metadata: { email: submission.value.email },
      });
    });

    void sendEmail({
      to: submission.value.email,
      subject: "Bem-vindo à telefonia.ia",
      react: WelcomeEmail({ nome: submission.value.nome }),
      tags: [{ name: "category", value: "welcome" }],
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      void recordSecurityEvent({
        severity: "low",
        category: "authn",
        eventType: "signup_duplicate",
        description: "Tentativa de signup com email já existente",
        metadata: { email: submission.value.email },
      });
      redirect("/login?signup=ok");
    }
    throw err;
  }

  redirect("/login?signup=ok");
}
