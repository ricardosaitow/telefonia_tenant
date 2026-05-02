"use server";

import { parseWithZod } from "@conform-to/zod";
import { redirect } from "next/navigation";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { createGateway, updateGateway } from "@/lib/fusionpbx";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { updateChannelInputSchema } from "./schemas";

export async function updateChannelAction(_prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: updateChannelInputSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }

  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  const v = submission.value;

  try {
    const result = await withTenantContext(ctx.activeTenantId, async (tx) => {
      const before = await tx.channel.findUnique({
        where: { id: v.id },
        select: {
          id: true,
          tipo: true,
          identificador: true,
          nomeAmigavel: true,
          status: true,
          sipHost: true,
          sipPort: true,
          sipTransport: true,
          sipUsername: true,
          sipRegister: true,
          pbxGatewayUuid: true,
        },
      });
      if (!before) return { count: 0 };

      // Handle FusionPBX gateway for voice_did
      let pbxGatewayUuid = before.pbxGatewayUuid;

      if (v.tipo === "voice_did" && v.sipHost && v.sipUsername && v.sipPassword) {
        if (before.pbxGatewayUuid) {
          // Update existing gateway
          try {
            await updateGateway(before.pbxGatewayUuid, {
              gatewayName: v.nomeAmigavel,
              sipHost: v.sipHost,
              sipPort: v.sipPort ?? 5060,
              sipTransport: v.sipTransport ?? "udp",
              username: v.sipUsername,
              password: v.sipPassword,
              register: v.sipRegister ?? true,
            });
          } catch (err) {
            throw new GatewayError(
              `Erro ao atualizar gateway SIP no PBX: ${err instanceof Error ? err.message : "erro desconhecido"}`,
            );
          }
        } else {
          // Create new gateway (channel existed before SIP was configured)
          const tenant = await tx.tenant.findUnique({
            where: { id: ctx.activeTenantId },
            select: { pbxDomainUuid: true, slug: true },
          });

          if (!tenant?.pbxDomainUuid) {
            throw new GatewayError("Tenant sem PBX configurado. Contate suporte.");
          }

          try {
            const gw = await createGateway({
              domainUuid: tenant.pbxDomainUuid,
              gatewayName: v.nomeAmigavel,
              sipHost: v.sipHost,
              sipPort: v.sipPort ?? 5060,
              sipTransport: v.sipTransport ?? "udp",
              username: v.sipUsername,
              password: v.sipPassword,
              register: v.sipRegister ?? true,
              context: `${tenant.slug}.local`,
            });
            pbxGatewayUuid = gw.gatewayUuid;
          } catch (err) {
            throw new GatewayError(
              `Erro ao provisionar gateway SIP no PBX: ${err instanceof Error ? err.message : "erro desconhecido"}`,
            );
          }
        }
      }

      const after = await tx.channel.update({
        where: { id: v.id },
        data: {
          tipo: v.tipo,
          identificador: v.identificador,
          nomeAmigavel: v.nomeAmigavel,
          ...(v.tipo === "voice_did"
            ? {
                sipHost: v.sipHost || undefined,
                sipPort: v.sipPort ?? 5060,
                sipTransport: v.sipTransport ?? "udp",
                sipUsername: v.sipUsername || undefined,
                sipPassword: v.sipPassword || undefined,
                sipRegister: v.sipRegister ?? true,
                pbxGatewayUuid,
              }
            : {}),
        },
        select: {
          id: true,
          tipo: true,
          identificador: true,
          nomeAmigavel: true,
          status: true,
          sipHost: true,
          sipPort: true,
          sipTransport: true,
          sipUsername: true,
          sipRegister: true,
          pbxGatewayUuid: true,
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
          action: "channel.update",
          entityType: "channel",
          entityId: after.id,
          before,
          after,
        },
      );

      return { count: 1 };
    });

    if (result.count === 0) {
      return submission.reply({ formErrors: ["Canal não encontrado."] });
    }
  } catch (err) {
    if (err instanceof GatewayError) {
      return submission.reply({ formErrors: [err.message] });
    }
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

  redirect("/channels");
}

class GatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayError";
  }
}
