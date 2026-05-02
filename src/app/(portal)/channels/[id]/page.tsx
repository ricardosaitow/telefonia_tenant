import { AlertTriangle } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { ChannelStatusBadge } from "@/features/channels/components/channel-status-badge";
import { WaConnectCard } from "@/features/channels/components/wa-connect-card";
import { WaInfoCard } from "@/features/channels/components/wa-info-card";
import { getChannelById, parseProvisioningMetadata } from "@/features/channels/queries";
import { CHANNEL_TYPE_LABEL } from "@/features/channels/schemas";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { ChannelForm } from "../channel-form";
import { RetryProvisionButton, ToggleStatusButton } from "./channel-actions";
import { DeleteChannelButton } from "./delete-button";
import { RoutingSection } from "./routing-section";

type EditChannelPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditChannelPage({ params }: EditChannelPageProps) {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "channel:manage")) {
    redirect("/channels");
  }

  const { id } = await params;
  const channel = await getChannelById(ctx.activeTenantId, id);
  if (!channel) notFound();

  const canManageRouting = can(ctx.membership.globalRole, "routing:manage");
  const provisioningError = parseProvisioningMetadata(channel.provisioningMetadata);

  const isWa = channel.tipo === "whatsapp";
  const isWaProvisioning = isWa && channel.status === "provisioning";
  const isWaActive = isWa && channel.status === "active";
  const isWaError = isWa && channel.status === "error";
  const isSipError = !isWa && channel.status === "error";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title={isWaProvisioning ? "Conectar WhatsApp" : "Editar canal"}
        description={
          <span className="flex items-center gap-2">
            {CHANNEL_TYPE_LABEL[channel.tipo]}
            {!isWaProvisioning && <> · {channel.identificador}</>}
            <ChannelStatusBadge status={channel.status} />
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {(channel.status === "active" || channel.status === "disabled") && (
              <ToggleStatusButton channelId={channel.id} currentStatus={channel.status} />
            )}
            <DeleteChannelButton id={channel.id} nome={channel.nomeAmigavel} />
          </div>
        }
      />

      {/* WhatsApp provisioning — show QR connect card */}
      {isWaProvisioning && <WaConnectCard channelId={channel.id} />}

      {/* WhatsApp active — show info card */}
      {isWaActive && (
        <WaInfoCard
          identificador={channel.identificador}
          waPushname={channel.waPushname}
          waWid={channel.waWid}
        />
      )}

      {/* WhatsApp error — show error + connect card for retry */}
      {isWaError && (
        <>
          <Card
            variant="solid"
            padding="default"
            className="border-destructive/30 flex-row items-start gap-3"
          >
            <AlertTriangle className="text-destructive mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">Erro na conexão WhatsApp</p>
              {provisioningError && (
                <p className="text-muted-foreground mt-1 text-xs">{provisioningError.error}</p>
              )}
            </div>
          </Card>
          <WaConnectCard channelId={channel.id} />
        </>
      )}

      {/* SIP error card (non-WA) */}
      {isSipError && (
        <Card
          variant="solid"
          padding="default"
          className="border-destructive/30 flex-row items-start gap-3"
        >
          <AlertTriangle className="text-destructive mt-0.5 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">Erro ao provisionar trunk SIP</p>
            {provisioningError && (
              <>
                <p className="text-muted-foreground mt-1 text-xs">{provisioningError.error}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Falhou em: {new Date(provisioningError.failedAt).toLocaleString("pt-BR")}
                </p>
              </>
            )}
            <div className="mt-3">
              <RetryProvisionButton channelId={channel.id} />
            </div>
          </div>
        </Card>
      )}

      {/* Edit form (skip for WA provisioning — user just needs to scan QR) */}
      {!isWaProvisioning && (
        <Card variant="solid" padding="lg">
          <ChannelForm
            mode="edit"
            defaultValues={{
              id: channel.id,
              tipo: channel.tipo,
              identificador: channel.identificador,
              nomeAmigavel: channel.nomeAmigavel,
              sipHost: channel.sipHost,
              sipPort: channel.sipPort,
              sipTransport: channel.sipTransport,
              sipUsername: channel.sipUsername,
              sipRegister: channel.sipRegister,
              pbxGatewayUuid: channel.pbxGatewayUuid,
              waBridgeUrl: channel.waBridgeUrl,
            }}
          />
        </Card>
      )}

      <RoutingSection
        activeTenantId={ctx.activeTenantId}
        channelId={channel.id}
        defaultRoutingRuleId={channel.defaultRoutingRuleId}
        canManage={canManageRouting}
      />
    </div>
  );
}
