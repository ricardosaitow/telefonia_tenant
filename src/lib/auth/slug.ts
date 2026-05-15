import { randomBytes } from "node:crypto";

/**
 * Slug helper — sobreviveu à remoção de Auth.js porque é usado também pela
 * criação de tenant no onboarding (slug do Tenant).
 *
 * Gera slug único pra Tenant a partir do nome. Lowercase, sem acentos, só
 * [a-z0-9-]. Sufixo random de 8 chars torna colisão virtualmente impossível
 * sem precisar checagem ao DB.
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
