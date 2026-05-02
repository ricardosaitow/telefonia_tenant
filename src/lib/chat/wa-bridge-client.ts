/**
 * wa-bridge HTTP client for chat message sending.
 *
 * Extends the provisioning client (src/lib/whatsapp/client.ts) with
 * the POST /send endpoint used by the chat module.
 */

const SEND_TIMEOUT_MS = 10_000;

export type WaSendPayload = {
  to: string;
  text?: string;
  media?: {
    url: string;
    mimeType: string;
    filename?: string;
  };
  quotedMessageId?: string;
};

export type WaSendResponse = {
  messageId: string;
};

/**
 * Raw response from wa-bridge /send — field is `id`, not `messageId`.
 */
type WaBridgeRawSendResponse = {
  ok: boolean;
  id: string;
};

/**
 * Send a message via wa-bridge.
 *
 * @param baseUrl - Channel's waBridgeUrl (e.g. "http://localhost:12345")
 * @param payload - Message data
 * @returns The wa-bridge message ID for ACK tracking
 */
export async function waBridgeSend(
  baseUrl: string,
  payload: WaSendPayload,
): Promise<WaSendResponse> {
  const url = new URL("/send", baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`wa-bridge /send returned ${res.status}: ${body}`);
  }

  const raw = (await res.json()) as WaBridgeRawSendResponse;
  return { messageId: raw.id };
}
