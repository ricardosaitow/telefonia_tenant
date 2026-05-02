import { withTenantContext } from "@/lib/db/tenant-context";

export async function listChannels(activeTenantId: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.channel.findMany({
      orderBy: [{ tipo: "asc" }, { nomeAmigavel: "asc" }],
      select: {
        id: true,
        tipo: true,
        identificador: true,
        nomeAmigavel: true,
        status: true,
        createdAt: true,
      },
    }),
  );
}

export async function getChannelById(activeTenantId: string, id: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.channel.findUnique({
      where: { id },
      select: {
        id: true,
        tipo: true,
        identificador: true,
        nomeAmigavel: true,
        status: true,
        provisioningMetadata: true,
        defaultRoutingRuleId: true,
        // SIP trunk fields (password excluded — use getChannelSipPassword)
        sipHost: true,
        sipPort: true,
        sipTransport: true,
        sipUsername: true,
        sipRegister: true,
        pbxGatewayUuid: true,
        // WhatsApp fields
        waBridgeUrl: true,
        waWid: true,
        waPushname: true,
        // Email fields (passwords excluded)
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpSecurity: true,
        inboundProto: true,
        inboundHost: true,
        inboundPort: true,
        inboundUser: true,
        inboundSecurity: true,
        lastPollAt: true,
        lastPollError: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  );
}

/**
 * Returns SIP password for a voice_did channel. Separate query to avoid
 * leaking password in default selects — UI calls this only on "reveal".
 */
export async function getChannelSipPassword(activeTenantId: string, channelId: string) {
  return withTenantContext(activeTenantId, async (tx) => {
    const ch = await tx.channel.findUnique({
      where: { id: channelId },
      select: { sipPassword: true },
    });
    return ch?.sipPassword ?? null;
  });
}

export type ChannelListItem = Awaited<ReturnType<typeof listChannels>>[number];
export type ChannelDetail = NonNullable<Awaited<ReturnType<typeof getChannelById>>>;

export type ProvisioningError = {
  error: string;
  failedAt: string;
};

export function parseProvisioningMetadata(raw: unknown): ProvisioningError | null {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "error" in raw &&
    "failedAt" in raw &&
    typeof (raw as Record<string, unknown>).error === "string" &&
    typeof (raw as Record<string, unknown>).failedAt === "string"
  ) {
    return raw as ProvisioningError;
  }
  return null;
}
