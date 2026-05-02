/**
 * CRUD de Extension (ramal SIP) no FusionPBX.
 *
 * Estrutura mínima viável replicando o que a UI do FusionPBX gera quando
 * cria ramal manualmente. Campos opcionais (CID, voicemail, follow-me,
 * forward) ficam null/default — feature avançada vem depois.
 *
 * Senha SIP: gerada aqui em formato URL-safe, persistida em PLAINTEXT
 * em `v_extensions.password` (FusionPBX usa pra digest auth — não tem
 * versão hash). Caller deve guardar `passwordRef` Infisical-style no
 * portal e expor via endpoint de "revelar" quando user pedir.
 */
import { randomBytes, randomUUID } from "node:crypto";

import { fusionpbxPool } from "./client";
import { reloadXml } from "./esl";

export type CreateExtensionInput = {
  domainUuid: string;
  /** domain_name correspondente, usado como user_context. */
  domainName: string;
  /** Número do ramal (ex.: "1001"). */
  extension: string;
  /** Nome amigável (ex.: "Recepção"). */
  description?: string | undefined;
};

export type CreateExtensionResult = {
  extensionUuid: string;
  /** Senha SIP em claro — caller deve persistir no secret store. */
  password: string;
};

/**
 * Gera senha SIP URL-safe (16 bytes random base64). Sem caracteres `=` ou `+`
 * pra evitar encoding pain em alguns clients SIP.
 */
function generateSipPassword(): string {
  return randomBytes(16).toString("base64url");
}

export async function createExtension(input: CreateExtensionInput): Promise<CreateExtensionResult> {
  const password = generateSipPassword();
  const extensionUuid = randomUUID();

  const client = await fusionpbxPool.connect();
  try {
    await client.query(
      `INSERT INTO v_extensions (
        extension_uuid, domain_uuid,
        extension, password,
        accountcode, user_context,
        directory_visible, directory_exten_visible,
        limit_max, limit_destination,
        call_timeout,
        extension_dialect, extension_voice,
        extension_type, enabled,
        description,
        insert_date, update_date
      ) VALUES (
        $1, $2,
        $3, $4,
        $5, $5,
        false, false,
        '5', '!USER_BUSY',
        30,
        'us', 'callie',
        'default', 'true',
        $6,
        now(), now()
      )`,
      [
        extensionUuid,
        input.domainUuid,
        input.extension,
        password,
        input.domainName,
        input.description ?? "",
      ],
    );
  } finally {
    client.release();
  }

  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });

  return { extensionUuid, password };
}

/**
 * Apaga Extension. Idempotente: silencia "extension não existe".
 */
export async function deleteExtension(extensionUuid: string): Promise<void> {
  await fusionpbxPool.query("DELETE FROM v_extensions WHERE extension_uuid = $1", [extensionUuid]);
  void reloadXml().catch((err) => {
    console.error("[fusionpbx] reloadxml falhou (best-effort):", err);
  });
}

/**
 * Lê senha em claro do FusionPBX. Usado pelo endpoint "revelar senha"
 * quando user precisa configurar Linphone. Sem cache — autoritativo.
 */
export async function readExtensionPassword(extensionUuid: string): Promise<string | null> {
  const result = await fusionpbxPool.query<{ password: string | null }>(
    "SELECT password FROM v_extensions WHERE extension_uuid = $1",
    [extensionUuid],
  );
  if (!result.rowCount) return null;
  return result.rows[0]?.password ?? null;
}
