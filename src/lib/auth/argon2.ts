import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/**
 * Parâmetros conforme docs/seguranca.md §7 (NIST 800-63B).
 *
 * - memoryCost: 65536 KiB = 64 MiB por thread.
 * - timeCost: 3 passes.
 * - parallelism: 4 threads.
 *
 * @node-rs/argon2 emite hash no formato PHC (string única que carrega params,
 * salt e hash). Não precisamos guardar params em colunas separadas.
 *
 * `algorithm: 2` = Argon2id (literal porque o enum exportado é `const enum` e
 * `isolatedModules` do tsconfig do Next bloqueia ambient const enums).
 */
const HASH_OPTIONS = {
  algorithm: 2,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argonHash(password, HASH_OPTIONS);
}

export function verifyPassword(hashed: string, password: string): Promise<boolean> {
  return argonVerify(hashed, password);
}
