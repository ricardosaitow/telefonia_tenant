"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { createGateway } from "@/lib/fusionpbx";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { provisionWaBridge } from "@/lib/whatsapp/provision";

import { channelInputSchema } from "./schemas";

export async function createChannelAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: channelInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  const v = submission.value;
  const isVoice = v.tipo === "voice_did";
  const isWhatsApp = v.tipo === "whatsapp";

  // For voice_did: validate tenant has PBX before creating channel
  let tenantPbx: { pbxDomainUuid: string; slug: string } | null = null;
  if (isVoice) {
    const tenant = await withTenantContext(ctx.activeTenantId, (tx) =>
      tx.tenant.findUnique({
        where: { id: ctx.activeTenantId },
        select: { pbxDomainUuid: true, slug: true },
      }),
    );

    if (!tenant?.pbxDomainUuid) {
      return submission.reply({
        formErrors: ["Tenant sem PBX configurado. Contate suporte."],
      });
    }
    tenantPbx = { pbxDomainUuid: tenant.pbxDomainUuid, slug: tenant.slug };
  }

  // WhatsApp: auto-generate temp identifier; will be replaced after QR scan
  const identificador = isWhatsApp ? `wa-pending-${crypto.randomUUID()}` : v.identificador!;

  // Step 1: Create channel
  let channelId: string;
  try {
    channelId = await withTenantContext(ctx.activeTenantId, async (tx) => {
      const channel = await tx.channel.create({
        data: {
          tenantId: ctx.activeTenantId,
          tipo: v.tipo,
          identificador,
          nomeAmigavel: v.nomeAmigavel,
          status: isVoice || isWhatsApp ? "provisioning" : "active",
          ...(isVoice
            ? {
                sipHost: v.sipHost,
                sipPort: v.sipPort ?? 5060,
                sipTransport: v.sipTransport ?? "udp",
                sipUsername: v.sipUsername,
                sipPassword: v.sipPassword,
                sipRegister: v.sipRegister ?? true,
              }
            : {}),
          // WhatsApp: waBridgeUrl + waContainerName filled after provisioning
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
          action: "channel.create",
          entityType: "channel",
          entityId: channel.id,
          after: { ...channel, sipPassword: channel.sipPassword ? "***" : undefined },
        },
      );
      return channel.id;
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return submission.reply({
        formErrors: ["Já existe um canal desse tipo com esse identificador."],
      });
    }
    throw err;
  }

  // Step 2: For voice_did, provision SIP gateway then update channel status
  if (isVoice && tenantPbx) {
    try {
      const result = await createGateway({
        domainUuid: tenantPbx.pbxDomainUuid,
        gatewayName: v.nomeAmigavel,
        sipHost: v.sipHost!,
        sipPort: v.sipPort ?? 5060,
        sipTransport: v.sipTransport ?? "udp",
        username: v.sipUsername!,
        password: v.sipPassword!,
        register: v.sipRegister ?? true,
        context: `${tenantPbx.slug}.local`,
      });

      await withTenantContext(ctx.activeTenantId, (tx) =>
        tx.channel.update({
          where: { id: channelId },
          data: {
            status: "active",
            pbxGatewayUuid: result.gatewayUuid,
            provisioningMetadata: Prisma.JsonNull,
          },
        }),
      );
    } catch (err) {
      await withTenantContext(ctx.activeTenantId, (tx) =>
        tx.channel.update({
          where: { id: channelId },
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
  }

  // Step 3: For WhatsApp, provision wa-bridge container
  if (isWhatsApp) {
    try {
      const result = await provisionWaBridge(channelId);

      await withTenantContext(ctx.activeTenantId, (tx) =>
        tx.channel.update({
          where: { id: channelId },
          data: {
            waBridgeUrl: result.url,
            waContainerName: result.containerName,
            provisioningMetadata: Prisma.JsonNull,
          },
        }),
      );
    } catch (err) {
      await withTenantContext(ctx.activeTenantId, (tx) =>
        tx.channel.update({
          where: { id: channelId },
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

  // WhatsApp: redirect to channel detail (user needs to see QR)
  // Others: redirect to list
  if (isWhatsApp) {
    redirect(`/channels/${channelId}`);
  }
  redirect("/channels");
}
