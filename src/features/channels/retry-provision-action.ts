"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { createGateway } from "@/lib/fusionpbx";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { destroyWaBridge, provisionWaBridge } from "@/lib/whatsapp/provision";

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
        waContainerName: true,
      },
    }),
  );

  if (!channel || channel.status !== "error") {
    return;
  }

  if (channel.tipo !== "voice_did" && channel.tipo !== "whatsapp") {
    return;
  }

  // Set to provisioning
  await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.channel.update({
      where: { id: channel.id },
      data: { status: "provisioning", provisioningMetadata: Prisma.JsonNull },
    }),
  );

  if (channel.tipo === "voice_did") {
    const tenant = await withTenantContext(ctx.activeTenantId, (tx) =>
      tx.tenant.findUnique({
        where: { id: ctx.activeTenantId },
        select: { pbxDomainUuid: true, slug: true },
      }),
    );

    if (!tenant?.pbxDomainUuid) return;

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
  } else if (channel.tipo === "whatsapp") {
    // Destroy existing container if present, then re-provision
    if (channel.waContainerName) {
      try {
        await destroyWaBridge(channel.waContainerName);
      } catch {
        // best-effort cleanup
      }
    }

    try {
      const result = await provisionWaBridge(channel.id);

      await withTenantContext(ctx.activeTenantId, async (tx) => {
        await tx.channel.update({
          where: { id: channel.id },
          data: {
            waBridgeUrl: result.url,
            waContainerName: result.containerName,
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
            after: { status: "provisioning", waContainerName: result.containerName },
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
                err instanceof Error ? err.message : "Erro desconhecido ao provisionar wa-bridge",
              failedAt: new Date().toISOString(),
            },
          },
        }),
      );
    }
  }

  revalidatePath("/channels");
  revalidatePath(`/channels/${channel.id}`);
}
