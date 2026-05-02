"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { createGateway } from "@/lib/fusionpbx";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

const inputSchema = z.object({ id: z.string().uuid() });

export async function retryProvisionAction(formData: FormData) {
  const parsed = inputSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  const channel = await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.channel.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        tipo: true,
        status: true,
        nomeAmigavel: true,
        sipHost: true,
        sipPort: true,
        sipTransport: true,
        sipUsername: true,
        sipPassword: true,
        sipRegister: true,
      },
    }),
  );

  if (!channel || channel.status !== "error" || channel.tipo !== "voice_did") {
    return;
  }

  const tenant = await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.tenant.findUnique({
      where: { id: ctx.activeTenantId },
      select: { pbxDomainUuid: true, slug: true },
    }),
  );

  if (!tenant?.pbxDomainUuid) return;

  // Set to provisioning
  await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.channel.update({
      where: { id: channel.id },
      data: { status: "provisioning", provisioningMetadata: Prisma.JsonNull },
    }),
  );

  try {
    const result = await createGateway({
      domainUuid: tenant.pbxDomainUuid,
      gatewayName: channel.nomeAmigavel,
      sipHost: channel.sipHost!,
      sipPort: channel.sipPort ?? 5060,
      sipTransport: channel.sipTransport ?? "udp",
      username: channel.sipUsername!,
      password: channel.sipPassword!,
      register: channel.sipRegister ?? true,
      context: `${tenant.slug}.local`,
    });

    await withTenantContext(ctx.activeTenantId, async (tx) => {
      await tx.channel.update({
        where: { id: channel.id },
        data: {
          status: "active",
          pbxGatewayUuid: result.gatewayUuid,
          provisioningMetadata: Prisma.JsonNull,
        },
      });
      await recordAuditInTx(
        tx,
        {
          tenantId: ctx.activeTenantId,
          accountId: ctx.account.id,
          membershipId: ctx.membership.id,
        },
        {
          action: "channel.provision_retry",
          entityType: "channel",
          entityId: channel.id,
          after: { status: "active", pbxGatewayUuid: result.gatewayUuid },
        },
      );
    });
  } catch (err) {
    await withTenantContext(ctx.activeTenantId, (tx) =>
      tx.channel.update({
        where: { id: channel.id },
        data: {
          status: "error",
          provisioningMetadata: {
            error:
              err instanceof Error ? err.message : "Erro desconhecido ao provisionar gateway SIP",
            failedAt: new Date().toISOString(),
          },
        },
      }),
    );
  }

  revalidatePath("/channels");
  revalidatePath(`/channels/${channel.id}`);
}
