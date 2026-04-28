"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/argon2";
import { prismaAdmin } from "@/lib/db/admin-client";
import { sendEmail } from "@/lib/email/send";
import { WelcomeEmail } from "@/lib/email/templates/welcome";
import { createTenantWithOwnerInTx } from "@/lib/onboarding/create-tenant";
import { provisionTenantPbx } from "@/lib/onboarding/provision-tenant-pbx";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/security/client-info";
import { recordSecurityEvent, recordSecurityEventInTx } from "@/lib/security/event";

import { signupSchema } from "./schemas";

/**
 * Versão Conform do signup. Mesma lógica de signupAction (criação atômica
 * Account + Tenant + Membership owner via prismaAdmin), mas no formato
 * `useActionState` + `parseWithZod`. Sucesso → redirect /login?signup=ok.
 *
 * P2002 (email duplicado) ou outras falhas → silently redirect mesmo
 * (anti-enumeration). Toda transação aborta atomicamente; nenhum tenant órfão.
 */
export async function signupFormAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: signupSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  // Rate limit por IP — signup é caro (cria tenant + memberhsip).
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
    const created = await prismaAdmin.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          email: submission.value.email,
          passwordHash,
          nome: submission.value.nome,
          locale: submission.value.locale,
        },
      });
      const tenant = await createTenantWithOwnerInTx(tx, {
        accountId: account.id,
        nomeTenant: submission.value.nomeTenant,
        locale: submission.value.locale,
      });
      await recordSecurityEventInTx(tx, {
        severity: "info",
        category: "authn",
        eventType: "signup_success",
        accountId: account.id,
        tenantId: tenant.id,
        metadata: {
          email: submission.value.email,
          tenantName: submission.value.nomeTenant,
        },
      });
      return { tenantId: tenant.id };
    });

    // Welcome email — fire-and-forget (não pode bloquear redirect, e falha
    // de mailer não pode quebrar signup que JÁ foi commitado).
    void sendEmail({
      to: submission.value.email,
      subject: "Bem-vindo à telefonia.ia",
      react: WelcomeEmail({
        nome: submission.value.nome,
        tenantName: submission.value.nomeTenant,
      }),
      tags: [{ name: "category", value: "welcome" }],
    });

    // Provisiona Domain no FusionPBX — fire-and-forget pelo mesmo motivo do
    // welcome email: PBX fora do ar não pode bloquear signup que já comitou.
    // Falha aqui deixa Tenant.pbxDomainUuid=null; UI de /extensions mostra
    // empty state "Domain não provisionado". `provisionTenantPbx` é
    // idempotente, então retentativa via job ou admin tool resolve.
    void provisionTenantPbx(created.tenantId).catch((err) => {
      console.error(
        "[signup] provision PBX falhou pra tenant %s — pbxDomainUuid fica null:",
        created.tenantId,
        err,
      );
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
