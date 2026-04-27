import type { Account } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";

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
 */

const SENTINEL_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$" +
  "c2VudGluZWxfc2FsdF8xNg$" +
  "Lc1Pj9z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3z3w";

export type VerifyResult =
  | { ok: true; account: Account }
  | { ok: false; reason: "invalid" | "locked" | "disabled" };

export async function verifyCredentials(email: string, password: string): Promise<VerifyResult> {
  const account = await prisma.account.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!account) {
    await verifyPassword(SENTINEL_HASH, password).catch(() => false);
    return { ok: false, reason: "invalid" };
  }

  const passwordOk = await verifyPassword(account.passwordHash, password).catch(() => false);

  if (!passwordOk) return { ok: false, reason: "invalid" };
  if (account.status === "locked") return { ok: false, reason: "locked" };
  if (account.status === "disabled") return { ok: false, reason: "disabled" };
  if (account.lockoutUntil && account.lockoutUntil > new Date()) {
    return { ok: false, reason: "locked" };
  }

  return { ok: true, account };
}
