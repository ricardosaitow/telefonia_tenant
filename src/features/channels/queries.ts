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
        createdAt: true,
        updatedAt: true,
      },
    }),
  );
}

export type ChannelListItem = Awaited<ReturnType<typeof listChannels>>[number];
export type ChannelDetail = NonNullable<Awaited<ReturnType<typeof getChannelById>>>;
