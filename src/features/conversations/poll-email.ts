import { decryptCredential } from "@/lib/crypto/channel-credentials";
import { prismaAdmin } from "@/lib/db/admin-client";
import { pollImap } from "@/lib/email/channel/imap-client";
import { pollPop3 } from "@/lib/email/channel/pop3-client";
import type { InboundConfig, InboundMessage } from "@/lib/email/channel/types";

import { processInboundEmail } from "./inbound-email";

/**
 * Polls all active email channels for new inbound messages.
 * Called by the cron route (/api/cron/email-poll).
 *
 * Flow per channel:
 *  1. Decrypt inbound credentials
 *  2. Poll IMAP or POP3 depending on inboundProto
 *  3. For each message: processInboundEmail()
 *  4. Update lastPollAt (and lastPollError on failure)
 */
export async function pollAllEmailChannels(): Promise<{ polled: number; errors: number }> {
  // Use prismaAdmin: this is a service-to-service cron, no user session.
  // Query channels across all tenants.
  const channels = await prismaAdmin.channel.findMany({
    where: {
      tipo: "email",
      status: "active",
      inboundHost: { not: null },
    },
    select: {
      id: true,
      tenantId: true,
      inboundProto: true,
      inboundHost: true,
      inboundPort: true,
      inboundUser: true,
      inboundPassEnc: true,
      inboundSecurity: true,
      lastPollAt: true,
    },
  });

  let errors = 0;

  for (const channel of channels) {
    try {
      if (!channel.inboundHost || !channel.inboundUser || !channel.inboundPassEnc) {
        continue;
      }

      const config: InboundConfig = {
        proto: (channel.inboundProto as "imap" | "pop3") ?? "imap",
        host: channel.inboundHost,
        port: channel.inboundPort ?? (channel.inboundProto === "pop3" ? 995 : 993),
        user: channel.inboundUser,
        pass: decryptCredential(channel.inboundPassEnc),
        security: (channel.inboundSecurity as "tls" | "starttls" | "none") ?? "tls",
      };

      let messages: InboundMessage[];

      if (config.proto === "pop3") {
        messages = await pollPop3(config);
      } else {
        messages = await pollImap(config, {
          unseenOnly: true,
          since: channel.lastPollAt ?? undefined,
        });
      }

      for (const msg of messages) {
        try {
          await processInboundEmail(channel.id, channel.tenantId, msg);
        } catch (err) {
          console.error(`[poll-email] error processing message for channel ${channel.id}:`, err);
        }
      }

      // Update poll timestamp
      await prismaAdmin.channel.update({
        where: { id: channel.id },
        data: { lastPollAt: new Date(), lastPollError: null },
      });
    } catch (err) {
      errors++;
      const errorMsg = err instanceof Error ? err.message : "Unknown poll error";
      console.error(`[poll-email] error polling channel ${channel.id}:`, errorMsg);

      try {
        await prismaAdmin.channel.update({
          where: { id: channel.id },
          data: { lastPollAt: new Date(), lastPollError: errorMsg },
        });
      } catch {
        // swallow update error
      }
    }
  }

  return { polled: channels.length, errors };
}
