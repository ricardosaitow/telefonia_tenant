/**
 * Inbound dialplan no FusionPBX pra rotear chamadas recebidas pelo trunk SIP
 * pro Asterisk audiosocket-ia (que faz bridge pra Gemini via bridge-ia).
 *
 * Padrão do INVITE da Vono (mas similar em outros provedores BR):
 *  - To: <sip:USERNAME@HOST> — destination_number vira USERNAME do trunk
 *  - X-DID: número do DID realmente discado (header custom)
 *
 * Por isso a regex precisa matchar o USERNAME do trunk OU o DID (com/sem 55).
 * O bridge para audiosocket usa o DID como "destination_number" enviado pro
 * Asterisk — assim o bridge-ia consegue resolver via `channels.identificador`.
 *
 * SIP header `X-Tenant-Slug` é exportado pra permitir multi-tenant — o
 * Asterisk lê esse header e seta `TENANT_SLUG` (extensions.conf).
 */
import { fusionpbxPool } from "./client";
import { reloadXml } from "./esl";

export type CreateInboundDialplanInput = {
  domainUuid: string;
  /** Context do tenant — ex: `<slug>.local`. */
  context: string;
  /** Slug do tenant — exportado como header SIP pro Asterisk. */
  tenantSlug: string;
  /** Username do trunk SIP (ex: "lefk81118"). */
  trunkUsername: string;
  /** DID puro (ex: "1154442434"). */
  did: string;
  /** Host:porta interno do Asterisk audiosocket-ia. */
  asteriskTarget?: string;
};

const DEFAULT_ASTERISK_TARGET = process.env.ASTERISK_AUDIOSOCKET_TARGET ?? "172.31.0.40:5060";

/**
 * Cria ou atualiza o inbound dialplan pra um DID/channel. Idempotente —
 * usa `dialplan_name = "inbound-<did>"` como chave.
 */
export async function createInboundDialplan(input: CreateInboundDialplanInput): Promise<void> {
  const target = input.asteriskTarget ?? DEFAULT_ASTERISK_TARGET;
  const dialplanName = `inbound-${input.did}`;
  // Match: username do trunk OU DID (com prefixo 55 opcional).
  const regex = `^(${input.trunkUsername}|${input.did}|55${input.did})$`;
  const xml = [
    `<extension name="${dialplanName}" continue="false">`,
    `<condition field="destination_number" expression="${regex}" break="on-false">`,
    `<action application="set" data="hangup_after_bridge=true"/>`,
    `<action application="export" data="sip_h_X-Tenant-Slug=${input.tenantSlug}"/>`,
    `<action application="bridge" data="sofia/external/${input.did}@${target}"/>`,
    `</condition>`,
    `</extension>`,
  ].join("");

  // Upsert por (domain_uuid, dialplan_name). Não há UNIQUE constraint;
  // delete + insert dentro da mesma chamada pra trocar XML em update.
  await fusionpbxPool.query(
    `DELETE FROM v_dialplans WHERE domain_uuid = $1 AND dialplan_name = $2`,
    [input.domainUuid, dialplanName],
  );

  await fusionpbxPool.query(
    `INSERT INTO v_dialplans (
      dialplan_uuid, domain_uuid,
      dialplan_context, dialplan_name, dialplan_number,
      dialplan_order, dialplan_enabled, dialplan_xml,
      dialplan_description, insert_date, update_date
    ) VALUES (
      gen_random_uuid(), $1,
      $2, $3, $4,
      '10', 'true', $5,
      $6, now(), now()
    )`,
    [
      input.domainUuid,
      input.context,
      dialplanName,
      input.trunkUsername,
      xml,
      `Portal auto-provisioned inbound route for DID ${input.did}`,
    ],
  );

  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });
}

/** Remove o inbound dialplan pra um DID. Idempotente. */
export async function deleteInboundDialplan(input: {
  domainUuid: string;
  did: string;
}): Promise<void> {
  await fusionpbxPool.query(
    `DELETE FROM v_dialplans WHERE domain_uuid = $1 AND dialplan_name = $2`,
    [input.domainUuid, `inbound-${input.did}`],
  );
  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });
}
