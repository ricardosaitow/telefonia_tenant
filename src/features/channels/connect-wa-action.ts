"use server";

import { revalidatePath } from "next/cache";

import { recordAuditInTx } from "@/lib/audit/record";
import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";
import { extractPhoneFromWid, getWaBridgeStatus } from "@/lib/whatsapp/client";

/**
 * Called by WaConnectCard when polling detects state === "ready".
 * Fetches wid + pushname from wa-bridge and updates the channel.
 */
export async function connectWaAction(channelId: string) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "channel:manage");

  const channel = await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.channel.findUnique({
      where: { id: channelId },
      select: { id: true, tipo: true, waBridgeUrl: true, status: true },
    }),
  );

  if (!channel) throw new Error("Canal não encontrado");
  if (channel.tipo !== "whatsapp") throw new Error("Canal não é WhatsApp");
  if (!channel.waBridgeUrl) throw new Error("Canal sem URL do wa-bridge");

  const status = await getWaBridgeStatus(channel.waBridgeUrl);

  if (status.state !== "ready") {
    throw new Error(`wa-bridge não está pronto (state: ${status.state})`);
  }

  if (!status.wid) {
    throw new Error("wa-bridge retornou ready mas sem wid");
  }

  const phone = extractPhoneFromWid(status.wid);

  await withTenantContext(ctx.activeTenantId, async (tx) => {
    await tx.channel.update({
      where: { id: channelId },
      data: {
        status: "active",
        identificador: phone,
        waWid: status.wid,
        waPushname: status.pushname,
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
        action: "channel.wa_connected",
        entityType: "channel",
        entityId: channelId,
        after: { phone, wid: status.wid, pushname: status.pushname },
      },
    );
  });

  revalidatePath(`/channels/${channelId}`);
  revalidatePath("/channels");
}
