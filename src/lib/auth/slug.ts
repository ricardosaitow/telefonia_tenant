import { randomBytes } from "node:crypto";

/**
 * Gera slug único pra Tenant a partir do nome. Lowercase, sem acentos, só
 * [a-z0-9-]. Sufixo random de 8 chars torna colisão virtualmente impossível
 * sem precisar checagem ao DB.
 *
 * Exemplo: "Pekiart Telecom" → "pekiart-telecom-x7k3p2qa".
 */
export function makeUniqueTenantSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const suffix = randomBytes(6)
    .toString("base64url")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);

  return `${base || "tenant"}-${suffix}`;
}
