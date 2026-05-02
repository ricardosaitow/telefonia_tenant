/**
 * CRUD de Domain no FusionPBX. 1 Domain = 1 tenant da plataforma.
 *
 * `v_domains` tem o registro mestre. Por defaults do FusionPBX, criar um
 * domain SOZINHO não é suficiente — pra ramais funcionarem o domain precisa
 * estar `domain_enabled=true` e o FreeSWITCH precisa ter recarregado XML
 * (chamado pelo caller via `reloadXml()` em `esl.ts`).
 *
 * Não criamos AS dialplans default do FusionPBX (huntgroup, conferencias,
 * voicemail, etc) — só o domain raw + dialplan customizado da Helena
 * (extensão 9999, criada via `createHelenaDialplan`).
 *
 * UUID gerado aqui (não delegamos pro Postgres `default_uuid()`) — assim
 * o portal grava o pbxDomainUuid antes de qualquer race window.
 */
import { randomUUID } from "node:crypto";

import { fusionpbxPool } from "./client";
import { reloadXml } from "./esl";

export type CreateDomainInput = {
  /** Nome canônico do tenant — vira o domain SIP. Ex.: "tenant-acme.local". */
  domainName: string;
  description?: string | undefined;
};

export type CreateDomainResult = {
  domainUuid: string;
};

/**
 * Cria Domain no FusionPBX + dialplan da Helena (9999) pra esse domain.
 *
 * Idempotência: se já existir Domain com mesmo `domain_name`, retorna o
 * UUID existente sem alterar (caller pode ter retentado depois de crash
 * entre INSERT e atualizar pbxDomainUuid no portal).
 */
export async function createDomain(input: CreateDomainInput): Promise<CreateDomainResult> {
  const client = await fusionpbxPool.connect();
  try {
    await client.query("BEGIN");

    // 1. Lookup idempotente
    const existing = await client.query<{ domain_uuid: string }>(
      "SELECT domain_uuid FROM v_domains WHERE domain_name = $1",
      [input.domainName],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      await client.query("COMMIT");
      return { domainUuid: existing.rows[0]!.domain_uuid };
    }

    const domainUuid = randomUUID();
    await client.query(
      `INSERT INTO v_domains (
        domain_uuid, domain_name, domain_enabled, domain_description,
        insert_date, update_date
      ) VALUES ($1, $2, true, $3, now(), now())`,
      [domainUuid, input.domainName, input.description ?? null],
    );

    // Dialplan Helena: extensão 9999 dispara bridge pro Asterisk lateral
    // (172.31.0.40:5060) que processa AudioSocket. Replica do dialplan
    // criado manualmente em tenant-a.local.
    await createHelenaDialplan(client, domainUuid, input.domainName);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Reload XML fora da TX — best-effort. Domain já commitou no PBX;
  // reloadxml só ativa em memória. Falha (ESL timeout/down) não pode
  // impedir o portal de gravar pbxDomainUuid. Próximo reloadxml resolve.
  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });

  // Re-lookup do UUID inserido (idempotente)
  const created = await fusionpbxPool.query<{ domain_uuid: string }>(
    "SELECT domain_uuid FROM v_domains WHERE domain_name = $1",
    [input.domainName],
  );
  if (!created.rowCount) {
    throw new Error(`Domain ${input.domainName} não encontrado após criar`);
  }
  return { domainUuid: created.rows[0]!.domain_uuid };
}

/**
 * Apaga Domain + tudo que depende dele (extensions, dialplans). Cascade
 * manual — FusionPBX não tem ON DELETE CASCADE em todas as FKs.
 *
 * Idempotente: silencia "domain não existe" pra que retentativa de delete
 * não falhe.
 */
export async function deleteDomain(domainUuid: string): Promise<void> {
  const client = await fusionpbxPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM v_dialplans WHERE domain_uuid = $1", [domainUuid]);
    await client.query("DELETE FROM v_extensions WHERE domain_uuid = $1", [domainUuid]);
    await client.query("DELETE FROM v_domains WHERE domain_uuid = $1", [domainUuid]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });
}

/**
 * Cria o dialplan padrão Helena (`9999 → bridge sofia/external/9999@asterisk`)
 * no contexto do domain dado. Chamado dentro de `createDomain` na mesma TX.
 *
 * O Asterisk lateral (172.31.0.40:5060) processa AudioSocket bidirectional
 * — ver commit `3b26ce8` no telefonia-ia.
 */
async function createHelenaDialplan(
  // pg PoolClient — type minimal, evita dep cruzada no caller.
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  domainUuid: string,
  context: string,
): Promise<void> {
  const dialplanUuid = randomUUID();
  const xml = `<extension name="helena-audiosocket" continue="false" uuid="${dialplanUuid}"><condition field="destination_number" expression="^9999$" break="on-false"><action application="bridge" data="sofia/external/9999@172.31.0.40:5060"/></condition></extension>`;

  await client.query(
    `INSERT INTO v_dialplans (
      dialplan_uuid, domain_uuid, dialplan_context, dialplan_name,
      dialplan_number, dialplan_enabled, dialplan_xml, dialplan_order,
      insert_date, update_date
    ) VALUES ($1, $2, $3, 'helena-audiosocket', '9999', 'true', $4, 100, now(), now())`,
    // dialplan_context = domain_name (FusionPBX padrão); user_context das
    // extensions também aponta pra ele, garantindo que a chamada do ramal
    // 1001 do tenant X enxergue só o dialplan 9999 do mesmo domain.
    [dialplanUuid, domainUuid, context, xml],
  );
}
