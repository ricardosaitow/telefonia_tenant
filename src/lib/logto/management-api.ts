/**
 * Cliente Management API do Logto self-hosted.
 *
 * Tokens M2M emitidos pelo endpoint `admin` (porque o app `m-default` vive no
 * tenant `admin`, com permissions pra acessar a Management API do tenant
 * `default`). Token é usado contra `https://logto.pekiart.com.br/api/...`.
 *
 * Cache de token in-memory por instância (token vive 1h, refresh transparente).
 */

const ADMIN_TOKEN_ENDPOINT =
  process.env.LOGTO_M2M_TOKEN_ENDPOINT ?? "https://admin-logto.pekiart.com.br/oidc/token";
const MANAGEMENT_API_BASE =
  process.env.LOGTO_MANAGEMENT_API_BASE ?? "https://logto.pekiart.com.br/api";
const RESOURCE = process.env.LOGTO_M2M_RESOURCE ?? "https://default.logto.app/api";

const M2M_APP_ID = process.env.LOGTO_M2M_APP_ID;
const M2M_APP_SECRET = process.env.LOGTO_M2M_APP_SECRET;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (!M2M_APP_ID || !M2M_APP_SECRET) {
    throw new Error("LOGTO_M2M_APP_ID/SECRET ausentes — Management API não disponível");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${M2M_APP_ID}:${M2M_APP_SECRET}`).toString("base64");
  const res = await fetch(ADMIN_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "all",
      resource: RESOURCE,
    }),
  });

  if (!res.ok) {
    throw new Error(`Logto M2M token falhou: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${MANAGEMENT_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Logto API ${init?.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type LogtoOrganization = {
  id: string;
  name: string;
  description?: string;
};

type LogtoOrganizationRole = {
  id: string;
  name: string;
};

/** Cache de role IDs por nome (1 lookup por instância — roles não mudam). */
let cachedRoles: Map<string, string> | null = null;

async function getOrganizationRoleIdByName(roleName: string): Promise<string> {
  if (!cachedRoles) {
    const roles = await api<LogtoOrganizationRole[]>("/organization-roles");
    cachedRoles = new Map(roles.map((r) => [r.name, r.id]));
  }
  const id = cachedRoles.get(roleName);
  if (!id) {
    throw new Error(
      `Organization role "${roleName}" não existe no template Logto. Crie em Authorization → Organization template → Roles.`,
    );
  }
  return id;
}

/**
 * Cria Organization no Logto, adiciona o user como member e atribui role.
 *
 * Retorna o `id` da org Logto pra persistir em `Tenant.logtoOrgId`.
 *
 * O `roleName` precisa existir no Organization template (criado via admin UI).
 * Default: `owner`.
 */
export async function createOrganizationWithOwner(args: {
  name: string;
  logtoUserId: string;
  roleName?: string;
}): Promise<LogtoOrganization> {
  const roleName = args.roleName ?? "owner";
  const roleId = await getOrganizationRoleIdByName(roleName);

  const org = await api<LogtoOrganization>("/organizations", {
    method: "POST",
    body: JSON.stringify({ name: args.name }),
  });

  await api(`/organizations/${org.id}/users`, {
    method: "POST",
    body: JSON.stringify({ userIds: [args.logtoUserId] }),
  });

  await api(`/organizations/${org.id}/users/roles`, {
    method: "POST",
    body: JSON.stringify({
      userIds: [args.logtoUserId],
      organizationRoleIds: [roleId],
    }),
  });

  return org;
}
