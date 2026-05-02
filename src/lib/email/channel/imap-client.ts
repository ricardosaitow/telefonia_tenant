import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import type { ConnectionTestResult, InboundConfig, InboundMessage } from "./types";

type PollImapOptions = {
  /** Only fetch unseen messages (default: false — fetches all). */
  unseenOnly?: boolean;
  /** Only fetch messages since this date. */
  since?: Date;
  /** Only fetch messages with UID greater than this (incremental sync). */
  sinceUid?: number;
};

/**
 * Poll IMAP for messages.
 * - unseenOnly=true + since: used by cron poll (conversations) — only new unread.
 * - unseenOnly=false: used by webmail sync — fetches all messages.
 */
export async function pollImap(
  config: InboundConfig,
  opts: PollImapOptions = {},
): Promise<InboundMessage[]> {
  const client = createClient(config);
  const messages: InboundMessage[] = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    try {
      // Build search criteria
      const searchCriteria: Record<string, unknown> = {};
      if (opts.sinceUid) {
        // Incremental: only UIDs after the last known one
        searchCriteria.uid = `${opts.sinceUid + 1}:*`;
      }
      if (opts.unseenOnly) {
        searchCriteria.seen = false;
      }
      if (opts.since) {
        searchCriteria.since = opts.since;
      }
      if (Object.keys(searchCriteria).length === 0) {
        searchCriteria.all = true;
      }

      for await (const msg of client.fetch(searchCriteria, {
        uid: true,
        envelope: true,
        flags: true,
        size: true,
      })) {
        const env = msg.envelope;
        if (!env) continue;

        const fromAddr = env.from?.[0];
        const toAddrs = env.to ?? [];
        const flags = msg.flags ?? new Set<string>();

        messages.push({
          messageId: env.messageId ?? null,
          uid: msg.uid,
          from: fromAddr ? formatAddress(fromAddr) : "unknown",
          fromName: fromAddr?.name ?? undefined,
          to: toAddrs.map(formatAddress),
          cc: env.cc?.map(formatAddress),
          subject: env.subject ?? null,
          text: null,
          html: null,
          date: env.date ? new Date(env.date) : null,
          inReplyTo: env.inReplyTo ?? null,
          references: [],
          sizeBytes: msg.size,
          mailbox: "INBOX",
          isRead: flags.has("\\Seen"),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return messages;
}

/**
 * Fetch the full source of a single email by UID (on-demand, when user opens it).
 * Uses `mailparser.simpleParser` for proper MIME/multipart/encoding handling.
 * Resolves CID inline images to base64 data URIs so they render in the iframe.
 */
export async function fetchImapBody(
  config: InboundConfig,
  uid: number,
): Promise<{ text: string | null; html: string | null }> {
  const client = createClient(config);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const { content } = await client.download(String(uid), undefined, { uid: true });
      const parsed = await simpleParser(content);

      let html = typeof parsed.html === "string" ? parsed.html : null;

      // Replace cid: references with inline base64 data URIs
      if (html && parsed.attachments?.length) {
        for (const att of parsed.attachments) {
          if (att.cid && att.content) {
            const dataUri = `data:${att.contentType};base64,${att.content.toString("base64")}`;
            html = html.replaceAll(`cid:${att.cid}`, dataUri);
          }
        }
      }

      return {
        text: parsed.text ?? null,
        html,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * Test IMAP connection by attempting login.
 */
export async function testImapConnection(config: InboundConfig): Promise<ConnectionTestResult> {
  const client = createClient(config);

  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown IMAP error" };
  }
}

function createClient(config: InboundConfig) {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.security === "tls",
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: config.security === "none" ? { rejectUnauthorized: false } : undefined,
    logger: false,
    socketTimeout: 90_000, // 90s socket idle timeout
    greetingTimeout: 30_000, // 30s for initial server greeting
  });
}

function formatAddress(addr: { name?: string; address?: string }): string {
  return addr.address ?? "unknown";
}
