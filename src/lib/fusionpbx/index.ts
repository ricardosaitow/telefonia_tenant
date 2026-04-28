/**
 * Integração FusionPBX (control plane do data plane SIP).
 *
 * Caminho de uso:
 *   - Tenant criado no portal → `createDomain()` cria Domain no FusionPBX.
 *   - Extension criada no portal → `createExtension()` cria ramal SIP no
 *     FusionPBX e devolve senha em claro (caller guarda em secret store).
 *
 * Fonte de verdade lógica: Postgres do portal (com as colunas
 * `pbxDomainUuid` / `pbxExtensionUuid` apontando pro FusionPBX). Operações
 * no FusionPBX são imperativas — falha aqui propaga pra Server Action,
 * que roll back o registro do portal.
 *
 * **Network**: portal precisa alcançar Postgres do FusionPBX (172.31.0.30:5432)
 * e ESL FreeSWITCH (172.31.0.31:8021). Verificar `FUSIONPBX_DB_URL` /
 * `FUSIONPBX_ESL_HOST` no env. Em dev local, o host alcança a defaultnet
 * Docker via routing direto sem precisar bridge.
 *
 * **Limitação atual:** senha SIP da extension fica em claro em
 * `v_extensions.password` (FusionPBX exige; sem versão hash). Quando
 * Infisical for ligado, mover pra `passwordRef` real e ler via secret API.
 */
export type { CreateDomainInput, CreateDomainResult } from "./domains";
export { createDomain, deleteDomain } from "./domains";
export { reloadXml } from "./esl";
export type { CreateExtensionInput, CreateExtensionResult } from "./extensions";
export { createExtension, deleteExtension, readExtensionPassword } from "./extensions";
