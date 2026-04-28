/**
 * Cliente Postgres do FusionPBX.
 *
 * O FusionPBX tem seu próprio Postgres (container `tel_fusionpbx_db` em
 * 172.31.0.30) — NÃO o mesmo do portal. Esta integração escreve direto nas
 * tabelas `v_domains` e `v_extensions` quando portal cria tenant/ramal.
 *
 * Pool singleton via globalThis (hot reload safe). Conexão URL vem de
 * `FUSIONPBX_DB_URL` no env (ver `.env.example`).
 *
 * **Acoplamento ao schema FusionPBX:** este módulo depende do layout interno
 * de `v_domains`/`v_extensions`. Mudança de versão do FusionPBX pode quebrar
 * — revisar campos no upgrade. Documentado em ADR P0xx (a criar).
 */
import { Pool } from "pg";

declare global {
  var __portalFusionpbxPool: Pool | undefined;
}

function createPool(): Pool {
  const url = process.env["FUSIONPBX_DB_URL"];
  if (!url) {
    throw new Error(
      "FUSIONPBX_DB_URL não definida. Aponte pro Postgres do FusionPBX " +
        "(ex.: postgresql://fusionpbx:PASS@172.31.0.30:5432/fusionpbx).",
    );
  }
  return new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const fusionpbxPool: Pool =
  globalThis.__portalFusionpbxPool ?? (globalThis.__portalFusionpbxPool = createPool());
