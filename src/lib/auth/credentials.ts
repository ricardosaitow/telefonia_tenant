import type { Account } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { recordSecurityEvent } from "@/lib/security/event";

import { verifyPassword } from "./argon2";

/**
 * Verifica credenciais email/password. Retorna a Account em sucesso, null em
 * qualquer falha (não distingue motivos pra não vazar info pra atacante).
 *
 * Roda argon2.verify mesmo quando a Account não existe — usa hash sentinela
 * pra manter timing constante (mitiga user enumeration via timing attack).
 *
 * Lockout (docs/seguranca.md §7): 5 falhas em 15 min → cooldown 15 min.
 * Implementado em camada acima (action/route handler) pra que essa função
 * fique pura e testável. Aqui só vetamos status != active e lockoutUntil
 * vigente.
 *
 * Side-effect: registra SecurityEvent (login_success / login_fail) com motivo
 * — fire-and-forget, não bloqueia retorno.
 */

const SENTINEL_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$" +
  "c2VudGluZWxfc2FsdF8xNg$" +
  "Lc1Pj9z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3w";

export type VerifyResult =
  | { ok: true; account: Account }
  | { ok: false; reason: "invalid" | "locked" | "disabled" };

export async function verifyCredentials(email: string, password: string): Promise<VerifyResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const account = await prisma.account.findUnique({ where: { email: normalizedEmail } });

  if (!account) {
    await verifyPassword(SENTINEL_HASH, password).catch(() => false);
    void recordSecurityEvent({
      severity: "low",
      category: "authn",
      eventType: "login_fail",
      description: "Email não cadastrado",
      metadata: { email: normalizedEmail, reason: "unknown_email" },
    });
    return { ok: false, reason: "invalid" };
  }

  const passwordOk = await verifyPassword(account.passwordHash, password).catch(() => false);

  if (!passwordOk) {
    void recordSecurityEvent({
      severity: "medium",
      category: "authn",
      eventType: "login_fail",
      description: "Senha incorreta",
      accountId: account.id,
      metadata: { email: normalizedEmail, reason: "wrong_password" },
    });
    return { ok: false, reason: "invalid" };
  }
  if (account.status === "locked") {
    void recordSecurityEvent({
      severity: "high",
      category: "authn",
      eventType: "login_blocked",
      description: "Tentativa em conta locked",
      accountId: account.id,
    });
    return { ok: false, reason: "locked" };
  }
  if (account.status === "disabled") {
    void recordSecurityEvent({
      severity: "medium",
      category: "authn",
      eventType: "login_blocked",
      description: "Tentativa em conta disabled",
      accountId: account.id,
    });
    return { ok: false, reason: "disabled" };
  }
  if (account.lockoutUntil && account.lockoutUntil > new Date()) {
    void recordSecurityEvent({
      severity: "medium",
      category: "authn",
      eventType: "login_blocked",
      description: "Lockout temporário ativo",
      accountId: account.id,
      metadata: { until: account.lockoutUntil.toISOString() },
    });
    return { ok: false, reason: "locked" };
  }

  void recordSecurityEvent({
    severity: "info",
    category: "authn",
    eventType: "login_success",
    accountId: account.id,
  });
  return { ok: true, account };
}
