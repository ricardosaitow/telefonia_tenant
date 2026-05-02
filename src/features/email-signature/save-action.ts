"use server";

import type { InputJsonValue } from "@/generated/prisma/internal/prismaNamespace";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";

import { renderSignatureHtml, renderSignatureText } from "./renderer";
import { signatureConfigSchema } from "./schemas";
import type { SignatureConfig } from "./types";

export async function saveSignature(input: { config: SignatureConfig }) {
  const ctx = await assertSessionAndMembership();
  const parsed = signatureConfigSchema.safeParse(input.config);
  if (!parsed.success) {
    console.error("[save-signature] zod issues:", JSON.stringify(parsed.error.issues));
    return {
      error: `Configuração inválida: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    };
  }

  const config = parsed.data;
  const cachedHtml = renderSignatureHtml(config as SignatureConfig);
  const cachedText = renderSignatureText(config as SignatureConfig);
  const configJson = config as unknown as InputJsonValue;

  const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
    return tx.emailSignature.upsert({
      where: { membershipId: ctx.membership.id },
      create: {
        tenantId: ctx.activeTenantId,
        membershipId: ctx.membership.id,
        config: configJson,
        cachedHtml,
        cachedText,
      },
      update: {
        config: configJson,
        cachedHtml,
        cachedText,
      },
      select: { id: true },
    });
  });

  return { ok: true, id: result.id };
}
