"use server";

import { withTenantContext } from "@/lib/db/tenant-context";

import type { SignatureConfig } from "./types";
import { DEFAULT_SIGNATURE_CONFIG } from "./types";

/**
 * Get signature for the current membership. Returns default config if none exists.
 */
export async function getSignatureByMembership(
  tenantId: string,
  membershipId: string,
): Promise<{ id: string | null; config: SignatureConfig; cachedHtml: string | null }> {
  return withTenantContext(tenantId, async (tx) => {
    const sig = await tx.emailSignature.findUnique({
      where: { membershipId },
      select: { id: true, config: true, cachedHtml: true },
    });
    if (!sig) {
      return { id: null, config: DEFAULT_SIGNATURE_CONFIG, cachedHtml: null };
    }
    return {
      id: sig.id,
      config: sig.config as unknown as SignatureConfig,
      cachedHtml: sig.cachedHtml,
    };
  });
}

/**
 * Get pre-rendered HTML for a membership's signature. Used at send time.
 */
export async function getSignatureHtml(
  tenantId: string,
  membershipId: string,
): Promise<{ html: string | null; text: string | null; config: SignatureConfig | null }> {
  return withTenantContext(tenantId, async (tx) => {
    const sig = await tx.emailSignature.findUnique({
      where: { membershipId },
      select: { cachedHtml: true, cachedText: true, config: true },
    });
    if (!sig) return { html: null, text: null, config: null };
    return {
      html: sig.cachedHtml,
      text: sig.cachedText,
      config: sig.config as unknown as SignatureConfig,
    };
  });
}
