import Pop3Client from "node-pop3";

import type { ConnectionTestResult, InboundConfig, InboundMessage } from "./types";

/**
 * Poll POP3 for new messages. Uses UIDL to track which messages have
 * already been fetched (caller provides knownUidls).
 */
export async function pollPop3(
  config: InboundConfig,
  knownUidls: string[] = [],
): Promise<InboundMessage[]> {
  const client = createClient(config);
  const messages: InboundMessage[] = [];

  try {
    await client.connect();

    const uidls = await client.UIDL();
    const uidlList = Array.isArray(uidls) ? uidls : [];
    const knownSet = new Set(knownUidls);

    for (const entry of uidlList) {
      const [msgNum, uidl] = Array.isArray(entry) ? entry : [null, null];
      if (!msgNum || !uidl || knownSet.has(String(uidl))) continue;

      try {
        const rawMessage = await client.RETR(Number(msgNum));
        const text = typeof rawMessage === "string" ? rawMessage : String(rawMessage);
        const parsed = parseRawEmail(text);

        messages.push({
          messageId: parsed.messageId,
          from: parsed.from,
          fromName: parsed.fromName,
          to: parsed.to,
          subject: parsed.subject,
          text: parsed.text,
          html: null,
          date: parsed.date,
          inReplyTo: parsed.inReplyTo,
          references: [],
          mailbox: "INBOX",
        });

        // Delete from server after successful fetch
        await client.DELE(Number(msgNum));
      } catch {
        // Skip messages that fail to parse
      }
    }
  } finally {
    await client.QUIT().catch(() => {});
  }

  return messages;
}

/**
 * Test POP3 connection by attempting login.
 */
export async function testPop3Connection(config: InboundConfig): Promise<ConnectionTestResult> {
  const client = createClient(config);

  try {
    await client.connect();
    await client.QUIT();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown POP3 error" };
  }
}

function createClient(config: InboundConfig) {
  return new Pop3Client({
    host: config.host,
    port: config.port,
    tls: config.security === "tls",
    user: config.user,
    password: config.pass,
    timeout: 10_000,
  });
}

/**
 * Minimal raw email parser — extracts headers and body text.
 * Full MIME parsing can be enhanced later with mailparser if needed.
 */
function parseRawEmail(raw: string) {
  const headerEnd = raw.indexOf("\r\n\r\n");
  const headerSection = headerEnd > 0 ? raw.substring(0, headerEnd) : raw;
  const body = headerEnd > 0 ? raw.substring(headerEnd + 4) : "";

  const getHeader = (name: string): string | null => {
    // eslint-disable-next-line security/detect-non-literal-regexp -- header names are hardcoded string literals below
    const regex = new RegExp(`^${name}:\\s*(.+)$`, "im");
    const match = headerSection.match(regex);
    return match ? match[1]!.trim() : null;
  };

  const fromRaw = getHeader("From") ?? "unknown";
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded by email header length
  const fromMatch = fromRaw.match(/(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?/);

  return {
    messageId: getHeader("Message-ID") ?? getHeader("Message-Id"),
    from: fromMatch?.[2] ?? fromRaw,
    fromName: fromMatch?.[1] ?? undefined,
    to: (getHeader("To") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    subject: getHeader("Subject"),
    text: body.trim() || null,
    date: getHeader("Date") ? new Date(getHeader("Date")!) : null,
    inReplyTo: getHeader("In-Reply-To"),
  };
}
