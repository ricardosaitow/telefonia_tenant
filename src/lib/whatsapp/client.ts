/**
 * HTTP client for wa-bridge.
 *
 * wa-bridge exposes:
 *   GET /status → { state, wid, pushname }
 *   GET /qr     → raw QR text (404 if none)
 *   POST /send  → send message
 *
 * This client wraps /status and /qr for the portal provisioning flow.
 */

export type WaBridgeState =
  | "starting"
  | "qr"
  | "authenticated"
  | "ready"
  | "auth_failure"
  | "disconnected";

export type WaBridgeStatus = {
  state: WaBridgeState;
  wid: string | null;
  pushname: string | null;
};

export type WaBridgeCombined = WaBridgeStatus & {
  qr: string | null;
};

const FETCH_TIMEOUT_MS = 5_000;

export async function getWaBridgeStatus(baseUrl: string): Promise<WaBridgeStatus> {
  const url = new URL("/status", baseUrl);
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`wa-bridge /status returned ${res.status}`);
  }
  return (await res.json()) as WaBridgeStatus;
}

export async function getWaBridgeQr(baseUrl: string): Promise<string | null> {
  const url = new URL("/qr", baseUrl);
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`wa-bridge /qr returned ${res.status}`);
  }
  return res.text();
}

/**
 * Combines /status + /qr in a single call for the polling endpoint.
 */
export async function getWaBridgeCombined(baseUrl: string): Promise<WaBridgeCombined> {
  const status = await getWaBridgeStatus(baseUrl);
  let qr: string | null = null;
  if (status.state === "qr") {
    qr = await getWaBridgeQr(baseUrl);
  }
  return { ...status, qr };
}

/**
 * Extracts phone number from WhatsApp WID.
 * e.g. "5511987654321@s.whatsapp.net" → "+5511987654321"
 */
export function extractPhoneFromWid(wid: string): string {
  const num = wid.split("@")[0];
  return `+${num}`;
}
