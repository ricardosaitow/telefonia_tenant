/**
 * Minimal Docker Engine API client via Unix socket.
 *
 * Uses Node's built-in `http` module with `socketPath` — no npm deps.
 * Only the subset needed for wa-bridge lifecycle is implemented.
 *
 * Docs: https://docs.docker.com/engine/api/v1.43/
 */

import http from "node:http";

const DOCKER_SOCKET = process.env.DOCKER_SOCKET ?? "/var/run/docker.sock";
const API_VERSION = "v1.43";

// ---------------------------------------------------------------------------
// Low-level request helper
// ---------------------------------------------------------------------------

type DockerRequestOpts = {
  method: string;
  path: string;
  body?: unknown;
  timeout?: number;
};

async function dockerRequest<T = unknown>(opts: DockerRequestOpts): Promise<T> {
  const { method, path, body, timeout = 30_000 } = opts;

  return new Promise<T>((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: `/${API_VERSION}${path}`,
        method,
        headers: {
          ...(payload
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
        timeout,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          const status = res.statusCode ?? 0;

          if (status >= 200 && status < 300) {
            // 204 No Content
            if (!raw || status === 204) {
              resolve(undefined as T);
              return;
            }
            try {
              resolve(JSON.parse(raw) as T);
            } catch {
              resolve(raw as T);
            }
          } else {
            let message = `Docker API ${method} ${path} → ${status}`;
            try {
              const err = JSON.parse(raw) as { message?: string };
              if (err.message) message += `: ${err.message}`;
            } catch {
              if (raw) message += `: ${raw.slice(0, 200)}`;
            }
            reject(new Error(message));
          }
        });
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Docker API timeout: ${method} ${path}`));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type CreateContainerOpts = {
  name: string;
  image: string;
  env?: string[];
  hostConfig?: {
    Binds?: string[];
    NetworkMode?: string;
    PortBindings?: Record<string, Array<{ HostIp?: string; HostPort: string }>>;
  };
  exposedPorts?: Record<string, Record<string, never>>;
};

type CreateContainerResponse = { Id: string };

export async function createContainer(opts: CreateContainerOpts): Promise<{ containerId: string }> {
  const body = {
    Image: opts.image,
    Env: opts.env,
    ExposedPorts: opts.exposedPorts,
    HostConfig: opts.hostConfig,
  };
  const res = await dockerRequest<CreateContainerResponse>({
    method: "POST",
    path: `/containers/create?name=${encodeURIComponent(opts.name)}`,
    body,
  });
  return { containerId: res.Id };
}

export async function startContainer(containerId: string): Promise<void> {
  await dockerRequest({
    method: "POST",
    path: `/containers/${encodeURIComponent(containerId)}/start`,
  });
}

export async function removeContainer(containerId: string, force = false): Promise<void> {
  const qs = force ? "?force=true" : "";
  await dockerRequest({
    method: "DELETE",
    path: `/containers/${encodeURIComponent(containerId)}${qs}`,
  });
}

type InspectResponse = {
  Id: string;
  Name: string;
  State: { Status: string; Running: boolean };
  NetworkSettings: {
    Networks?: Record<string, { IPAddress?: string }>;
    Ports?: Record<string, Array<{ HostIp: string; HostPort: string }> | null>;
  };
};

export type ContainerInfo = {
  id: string;
  name: string;
  state: string;
  running: boolean;
  networkIp: string | null;
  ports: Record<string, string | null>;
};

export async function inspectContainer(containerId: string): Promise<ContainerInfo> {
  const res = await dockerRequest<InspectResponse>({
    method: "GET",
    path: `/containers/${encodeURIComponent(containerId)}/json`,
  });

  // Extract first network IP
  let networkIp: string | null = null;
  if (res.NetworkSettings.Networks) {
    for (const net of Object.values(res.NetworkSettings.Networks)) {
      if (net.IPAddress) {
        networkIp = net.IPAddress;
        break;
      }
    }
  }

  // Extract port mappings
  const ports: Record<string, string | null> = {};
  if (res.NetworkSettings.Ports) {
    for (const [containerPort, bindings] of Object.entries(res.NetworkSettings.Ports)) {
      ports[containerPort] = bindings?.[0]?.HostPort ?? null;
    }
  }

  return {
    id: res.Id,
    name: res.Name.replace(/^\//, ""),
    state: res.State.Status,
    running: res.State.Running,
    networkIp,
    ports,
  };
}
