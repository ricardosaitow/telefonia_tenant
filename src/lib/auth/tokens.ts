import { createHash, randomBytes } from "node:crypto";

/**
 * Gera token criptográfico seguro em base64url.
 * Usado pra reset de senha, convites, etc.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Hash SHA-256 do token pra armazenar no DB.
 * Nunca armazenar o token em claro — o valor raw vai pro email/link.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
