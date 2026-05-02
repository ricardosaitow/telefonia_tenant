/**
 * Provision / destroy wa-bridge containers via Docker API.
 *
 * Each WhatsApp channel gets its own container running the wa-bridge image.
 * Session data persists in a named Docker volume so reconnections survive restarts.
 *
 * Network modes (env WA_BRIDGE_NETWORK_MODE):
 *   - "host" (default/dev): binds a random port on 127.0.0.1, URL = http://localhost:{port}
 *   - "docker" (prod): no port binding, URL = http://{containerName}:9090 (internal network)
 */

import {
  createContainer,
  inspectContainer,
  removeContainer,
  startContainer,
} from "@/lib/docker/client";

const WA_BRIDGE_IMAGE = process.env.WA_BRIDGE_IMAGE ?? "telefonia-ia/wa-bridge:0.1.0";
const WA_BRIDGE_INTERNAL_PORT = 9090;
const WA_BRIDGE_NETWORK_MODE = process.env.WA_BRIDGE_NETWORK_MODE ?? "host";
const WA_BRIDGE_DOCKER_NETWORK = process.env.WA_BRIDGE_DOCKER_NETWORK ?? "telefonia-ia_default";
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL ?? "http://localhost:5000";

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function containerName(channelId: string): string {
  return `tel_wa_${channelId.slice(0, 8)}`;
}

function volumeName(channelId: string): string {
  return `wa_session_${channelId.slice(0, 8)}`;
}

async function waitForReady(url: string): Promise<void> {
  const deadline = Date.now() + POLL_MAX_MS;
  const statusUrl = new URL("/status", url).toString();

  while (Date.now() < deadline) {
    try {
      const res = await fetch(statusUrl, { signal: AbortSignal.timeout(3_000) });
      if (res.ok) return;
    } catch {
      // container still starting — retry
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`wa-bridge not ready after ${POLL_MAX_MS / 1000}s at ${url}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ProvisionResult = {
  containerName: string;
  url: string;
};

export async function provisionWaBridge(channelId: string): Promise<ProvisionResult> {
  const name = containerName(channelId);
  const volume = volumeName(channelId);
  const isDockerNetwork = WA_BRIDGE_NETWORK_MODE === "docker";

  const webhookBase = isDockerNetwork ? "http://host.docker.internal:3000" : PORTAL_BASE_URL;

  const { containerId } = await createContainer({
    name,
    image: WA_BRIDGE_IMAGE,
    env: [
      `WA_PORT=${WA_BRIDGE_INTERNAL_PORT}`,
      `CHANNEL_ID=${channelId}`,
      `WEBHOOK_URL=${webhookBase}/api/chat/webhook/whatsapp`,
      `WEBHOOK_ACK_URL=${webhookBase}/api/chat/webhook/whatsapp/ack`,
    ],
    exposedPorts: { [`${WA_BRIDGE_INTERNAL_PORT}/tcp`]: {} },
    hostConfig: {
      Binds: [`${volume}:/app/.wwebjs_auth`],
      ...(isDockerNetwork
        ? { NetworkMode: WA_BRIDGE_DOCKER_NETWORK }
        : {
            PortBindings: {
              [`${WA_BRIDGE_INTERNAL_PORT}/tcp`]: [{ HostIp: "127.0.0.1", HostPort: "0" }],
            },
          }),
    },
  });

  await startContainer(containerId);

  // Resolve URL based on network mode
  let url: string;
  if (isDockerNetwork) {
    url = `http://${name}:${WA_BRIDGE_INTERNAL_PORT}`;
  } else {
    const info = await inspectContainer(containerId);
    const hostPort = info.ports[`${WA_BRIDGE_INTERNAL_PORT}/tcp`];
    if (!hostPort) {
      throw new Error(`wa-bridge container ${name} started but no host port bound`);
    }
    url = `http://localhost:${hostPort}`;
  }

  await waitForReady(url);

  return { containerName: name, url };
}

export async function destroyWaBridge(name: string): Promise<void> {
  await removeContainer(name, true);
}
