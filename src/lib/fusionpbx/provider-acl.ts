/**
 * Garante que o IP do provedor SIP está na ACL `providers` do FusionPBX.
 *
 * Sem isso, INVITES inbound do provedor são rejeitados por ACL (e como
 * `auth-calls=false` no profile external, ACL é a única barreira de
 * segurança — abrir a ACL é proposital + restrito ao IP do provider).
 *
 * Estratégia:
 *   1. Resolve `sipHost` via DNS → lista de IPs (A records).
 *   2. Pra cada IP, faz upsert na `v_access_control_nodes` (idempotente).
 *   3. Dispara `reloadacl` no FreeSWITCH via ESL (`reloadXml` já cobre).
 *
 * Limitação: muitos provedores usam pool dinâmico de IPs (CDN-style). Pra
 * esses casos, o operador deve configurar manualmente o CIDR amplo
 * (rodando `scripts/bootstrap-fusionpbx.sh` com PROVIDER_RANGES). O lookup
 * DNS é fallback razoável pra começar.
 */
import { promises as dns } from "node:dns";

import { fusionpbxPool } from "./client";
import { reloadAcl } from "./esl";

/**
 * Adiciona CIDR(s) à ACL `providers`.
 *
 * Estratégia de descoberta dos CIDRs:
 *   1. Se `manualCidr` foi passado (do form do channel), usa ele —
 *      provedores com pool dinâmico de IPs (Twilio, etc) precisam disso
 *      porque DNS pontual não cobre a faixa real.
 *   2. Senão, resolve `sipHost` via DNS A → /32 pra cada IP.
 *   3. sipHost que já é IP literal → /32 direto.
 *
 * Aceita lista vírgula-separada em `manualCidr` (ex: `52.0.0.0/8,54.0.0.0/8`).
 * IPs sem mask viram /32 automaticamente.
 */
export async function ensureProviderAclEntry(
  sipHost: string,
  manualCidr?: string | null,
): Promise<string[]> {
  const cidrs = await resolveCidrs(sipHost, manualCidr);
  if (cidrs.length === 0) return [];

  for (const cidr of cidrs) {
    await fusionpbxPool.query(
      `INSERT INTO v_access_control_nodes
        (access_control_node_uuid, access_control_uuid, node_type, node_cidr, node_description, insert_date)
        SELECT gen_random_uuid(), access_control_uuid, 'allow', $1,
               $2, NOW()
        FROM v_access_controls WHERE access_control_name = 'providers'
        AND NOT EXISTS (
          SELECT 1 FROM v_access_control_nodes n
          JOIN v_access_controls a ON a.access_control_uuid = n.access_control_uuid
          WHERE a.access_control_name = 'providers' AND n.node_cidr = $1
        )`,
      [cidr, `auto: ${sipHost}`],
    );
  }

  void reloadAcl().catch((err) => {
    console.error("[fusionpbx] reloadacl falhou (best-effort):", err);
  });

  return cidrs;
}

async function resolveCidrs(sipHost: string, manualCidr?: string | null): Promise<string[]> {
  if (manualCidr && manualCidr.trim().length > 0) {
    return manualCidr
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => (c.includes("/") ? c : `${c}/32`));
  }

  let ips: string[];
  try {
    ips = await dns.resolve4(sipHost);
  } catch (err) {
    // eslint-disable-next-line security/detect-unsafe-regex
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(sipHost)) {
      ips = [sipHost];
    } else {
      console.error(`[fusionpbx] DNS resolve falhou pra ${sipHost}:`, err);
      return [];
    }
  }
  return ips.map((ip) => `${ip}/32`);
}
