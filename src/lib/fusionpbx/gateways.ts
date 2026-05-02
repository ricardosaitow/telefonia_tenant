/**
 * CRUD de SIP Gateway (trunk) no FusionPBX.
 *
 * Um gateway = 1 trunk SIP externo (provedor VoIP). Gravado em
 * `v_sip_gateways` vinculado ao domain do tenant. Após INSERT/UPDATE/DELETE,
 * `reloadXml()` é chamado best-effort (mesmo padrão de domains.ts e
 * extensions.ts).
 *
 * Senha SIP fica em claro em `v_sip_gateways.password` — FusionPBX usa pra
 * digest auth SIP (não suporta hash). Portal também persiste cópia no campo
 * `channels.sip_password` pra exibir ao user.
 */
import { randomUUID } from "node:crypto";

import { fusionpbxPool } from "./client";
import { reloadXml } from "./esl";

export type CreateGatewayInput = {
  domainUuid: string;
  /** Nome amigável do gateway (ex: "Vivo DID"). */
  gatewayName: string;
  /** Host do provedor SIP (ex: "sip.vivo.com.br"). */
  sipHost: string;
  sipPort: number;
  /** "udp" | "tcp" | "tls" */
  sipTransport: string;
  username: string;
  password: string;
  register: boolean;
  /** domain_name do tenant — usado como context. */
  context: string;
};

export type CreateGatewayResult = {
  gatewayUuid: string;
};

export async function createGateway(input: CreateGatewayInput): Promise<CreateGatewayResult> {
  const gatewayUuid = randomUUID();
  const proxy = input.sipPort === 5060 ? input.sipHost : `${input.sipHost}:${input.sipPort}`;

  await fusionpbxPool.query(
    `INSERT INTO v_sip_gateways (
      sip_gateway_uuid, domain_uuid,
      gateway, proxy, realm,
      username, password,
      register, register_transport,
      expire_seconds, retry_seconds,
      caller_id_in_from,
      context, profile,
      enabled, description,
      insert_date, update_date
    ) VALUES (
      $1, $2,
      $3, $4, $5,
      $6, $7,
      $8, $9,
      3600, 30,
      'true',
      $10, 'external',
      'true', $11,
      now(), now()
    )`,
    [
      gatewayUuid,
      input.domainUuid,
      input.gatewayName,
      proxy,
      input.sipHost,
      input.username,
      input.password,
      input.register ? "true" : "false",
      input.sipTransport,
      input.context,
      `Portal auto-provisioned: ${input.gatewayName}`,
    ],
  );

  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });

  return { gatewayUuid };
}

export type UpdateGatewayInput = {
  gatewayName: string;
  sipHost: string;
  sipPort: number;
  sipTransport: string;
  username: string;
  password: string;
  register: boolean;
};

export async function updateGateway(gatewayUuid: string, input: UpdateGatewayInput): Promise<void> {
  const proxy = input.sipPort === 5060 ? input.sipHost : `${input.sipHost}:${input.sipPort}`;

  await fusionpbxPool.query(
    `UPDATE v_sip_gateways SET
      gateway = $2,
      proxy = $3, realm = $4,
      username = $5, password = $6,
      register = $7, register_transport = $8,
      update_date = now()
    WHERE sip_gateway_uuid = $1`,
    [
      gatewayUuid,
      input.gatewayName,
      proxy,
      input.sipHost,
      input.username,
      input.password,
      input.register ? "true" : "false",
      input.sipTransport,
    ],
  );

  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });
}

/**
 * Apaga gateway. Idempotente: silencia "gateway não existe".
 */
export async function deleteGateway(gatewayUuid: string): Promise<void> {
  await fusionpbxPool.query("DELETE FROM v_sip_gateways WHERE sip_gateway_uuid = $1", [
    gatewayUuid,
  ]);

  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });
}
