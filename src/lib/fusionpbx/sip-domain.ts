/**
 * Resolves the SIP domain for a tenant slug.
 *
 * Env `SIP_DOMAIN_SUFFIX` controls the suffix (no leading dot). Production uses
 * a public wildcard like `tel.pekiart.com.br` so softphones resolve DNS directly.
 * Dev defaults to `local` to match historical fixtures.
 */
const DEFAULT_SUFFIX = "local";

export function getSipDomainSuffix(): string {
  const raw = process.env.SIP_DOMAIN_SUFFIX?.trim();
  if (!raw) return DEFAULT_SUFFIX;
  return raw.replace(/^\.+/, "");
}

export function sipDomainForTenant(tenantSlug: string): string {
  return `${tenantSlug}.${getSipDomainSuffix()}`;
}
