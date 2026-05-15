# SSO Pekiart — Checklist de Deploy em Produção

Documento operacional pra subir o ecossistema SSO Logto em produção.
Aplicar ANTES de subir os apps Next (portal, financ.ia, meet.ia).

Ver design completo em `docs/migration-logto-org-ids.md` e memórias
[[sso-pekiart-logto]], [[portal-fase3-pattern]], [[sso-validated-cross-app]].

---

## 1. Logto self-host

### 1.1 Subir container

Repo `logto-infra/` (separado, já commitado). Subir em servidor com
domínio `logto.pekiart.com.br` apontando pro host. Editar
`docker-compose.yml` antes de subir prod:

- `DB_URL`: usar Postgres managed em vez de container (RDS, Cloud SQL)
- `ENDPOINT`: `https://logto.pekiart.com.br` (https em prod!)
- `ADMIN_ENDPOINT`: `https://logto.pekiart.com.br/console` (path-based)
  ou subdomain
- `POSTGRES_PASSWORD`: gerar senha forte, **não** commitar
- Remover bind 56200/56201 — subir atrás de nginx/Caddy com TLS

### 1.2 Welcome wizard (uma vez)

Abrir admin console e criar super-admin.

### 1.3 Sign-in experience

Sidebar → Sign-in & account → Sign-up and sign-in. Habilitar:

- Sign-up identifier: **Email address** (+ password obrigatória)
- Sign-in: **Email** + **Username**, ambos com password
- (Quando email connector estiver pronto): habilitar verification code

### 1.4 Email connector

Connectors → Email connectors → Add: SMTP Hostinger conforme memória
[[email-from-address]] (no-reply@pekiart.com.br, smtp.hostinger.com:465).

### 1.5 Google OAuth (opcional)

Connectors → Social → Google. Precisa de credenciais GCP Console
(criar OAuth 2.0 Client ID, web app, redirect URI = a que Logto fornecer).

### 1.6 Organization template

Authorization → Organization template:

**Permissions** (criar antes das roles):

- `meeting:create`, `meeting:read`, `meeting:approve`, `org:manage`

**Roles** (assign permissions):

- `owner` → todas as 4 permissions
- `admin` → meeting:\* (sem org:manage)
- `member` → meeting:create + meeting:read

### 1.7 Applications (3, uma por produto)

Authorization → Applications → Create. Tipo: **Traditional web**,
framework **Next.js (App Router)**. Pra cada:

| App        | Redirect URI                                                  | Post sign-out URI                   |
| ---------- | ------------------------------------------------------------- | ----------------------------------- |
| `meet`     | `https://meet.pekiart.com.br/api/logto/sign-in-callback`      | `https://meet.pekiart.com.br/`      |
| `portal`   | `https://telefonia.pekiart.com.br/api/logto/sign-in-callback` | `https://telefonia.pekiart.com.br/` |
| `financia` | `https://financia.pekiart.com.br/api/logto/sign-in-callback`  | `https://financia.pekiart.com.br/`  |

Anotar `App ID`, `App secret`, `cookie secret` de cada um.

### 1.8 Organizations

Pra cada cliente real (não Pekiart de teste), criar organization
correspondente ao Tenant do produto. Adicionar membros com as roles
apropriadas.

---

## 2. Apps Next.js — variáveis de ambiente

Cada app precisa das 5 vars (NÃO commitar — usar Infisical ou similar):

```env
LOGTO_ENDPOINT=https://logto.pekiart.com.br/
LOGTO_APP_ID=<app id do Logto admin>
LOGTO_APP_SECRET=<app secret>
LOGTO_BASE_URL=https://<dominio do app>
LOGTO_COOKIE_SECRET=<cookie secret>
```

---

## 3. Portal (telefon.ia) — passos pós-deploy

### 3.1 Migrations

`pnpm prisma migrate deploy` aplica as duas migrations Logto:

- `add_logto_org_id` (Tenant.logto_org_id)
- `add_logto_sub_to_account` (Account.logto_sub, passwordHash nullable)

### 3.2 Permissões DB pra bridge-ia (data plane consome via portal_db)

```sql
GRANT USAGE ON SCHEMA public TO bridge_reader;
GRANT SELECT ON tenants, channels, routing_rules, agents, agent_versions TO bridge_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bridge_reader;
ALTER ROLE bridge_reader BYPASSRLS;
```

### 3.3 Seed Tenant inicial (1x por cliente)

Quando um cliente novo entra:

1. Criar Organization no Logto admin (anotar org ID)
2. Adicionar user(s) à org com role apropriada
3. Inserir Tenant no portal DB:

```sql
INSERT INTO tenants (id, logto_org_id, slug, nome_fantasia, razao_social, status, plan_slug, default_locale, created_at, updated_at)
VALUES (gen_random_uuid(), '<logto_org_id>', '<slug>', '<nome>', '<razao>', 'active', 'demo', 'pt-BR', NOW(), NOW());
```

4. Provisionar PBX (cria `pbx_domain_uuid`): rota dev `/api/dev/provision-pekiart-pbx`
   exemplo, ou helper `provisionTenantPbx(tenantId)` chamado de onboarding UI.

### 3.4 Remover rota dev `provision-pekiart-pbx`

```bash
rm -rf src/app/api/dev/provision-pekiart-pbx
```

Substituir por botão "Provisionar PBX" no UI de onboarding (V1.5).

### 3.5 Cleanup deps (quando confiantes)

```bash
pnpm remove next-auth @auth/prisma-adapter
```

Tabelas `Account`, `Session`, `TenantMembership` ficam dormentes —
drop em migration dedicada quando confiantes.

---

## 4. financ.ia (Sprint 3 Fase 1+2 commitada)

Funciona em paralelo com Better-Auth — `/sso-status` valida. Fase 3
(remover Better-Auth, adaptar [[better-auth-rls]]) é sprint dedicada.

---

## 5. meet.ia (Sprint 1 completa)

Auth real Logto. Nada pendente.

---

## 6. Data plane (FusionPBX + Asterisk + bridge-ia)

**Runtime changes aplicadas em dev** que precisam virar **fonte**
no `/home/ricardo/projects/telefonia-ia/` antes de deploy:

### 6.1 FusionPBX

```sql
-- ACL providers: faixa Vono2
INSERT INTO v_access_control_nodes
  (access_control_node_uuid, access_control_uuid, node_type, node_cidr, node_description, insert_date)
SELECT gen_random_uuid(), access_control_uuid, 'allow', '190.89.248.0/24',
       'vono2.me provider range', NOW()
FROM v_access_controls WHERE access_control_name = 'providers';

-- ACL rfc1918: adicionar loopback pra fs_cli interno funcionar
INSERT INTO v_access_control_nodes (...)
SELECT ..., 'allow', '127.0.0.0/8', 'loopback (fs_cli)', NOW()
FROM v_access_controls WHERE access_control_name = 'rfc1918';
```

Aplicar via fs_cli: `api reloadacl`.

**Inbound dialplan** por tenant (criado quando channel voice_did é
criado no portal — TODO: helper `createInboundRoute(channel)` similar
a `createGateway()`):

```sql
-- exemplo pro tenant Pekiart com gateway SIP "lefk81118":
INSERT INTO v_dialplans (..., dialplan_context, dialplan_number, dialplan_order, dialplan_xml)
VALUES (..., '<tenant_slug>.local', '<sip_username>', 50,
  '<extension name="<ch_id>-inbound" continue="false">
     <condition field="destination_number" expression="^<sip_username>$" break="on-false">
       <action application="bridge" data="sofia/external/<channel_identificador>@172.31.0.40:5060"/>
     </condition>
   </extension>');
```

### 6.2 FreeSWITCH vars.xml (dentro do container)

Em prod com IP público fixo + port forward configurado:

```xml
<X-PRE-PROCESS cmd="set" data="external_sip_ip=<IP_PUBLICO>" />
<X-PRE-PROCESS cmd="set" data="external_rtp_ip=<IP_PUBLICO>" />
```

Ou usar `auto-nat` se IP for dinâmico.

### 6.3 Asterisk extensions.conf

Em `/etc/asterisk/extensions.conf`, atualizar `TENANT_SLUG` pra ser
**dinâmico** (extraído do SIP header `X-Tenant-Slug` que FusionPBX
seta no outbound) em vez de hardcoded `pekiart-teste-of3wtxab`.

V1: hardcoded por tenant em test single-tenant. V2 (prod):

```ini
[audiosocket-ia]
exten => _X.,1,Set(__DIALED_EXT=${EXTEN})
 same => n,Set(__TENANT_SLUG=${SIP_HEADER(X-Tenant-Slug)})
 same => n,Goto(s,1)
```

### 6.4 bridge-ia Gemini model

Atualizar `env GEMINI_MODEL` no docker-compose pra
`gemini-2.5-flash-native-audio-latest` (NÃO mais
`gemini-3.1-flash-live` que era o default antigo).

Validar antes do deploy: o modelo gera output audio (não só 2 bytes).

### 6.5 Network: RTP range exposure

Container `tel_fusionpbx` precisa do range UDP 16384-32767 exposto.
Opções:

**Opção A** (preferida em prod): adicionar ao docker-compose:

```yaml
ports:
  - "16384-32767:16384-32767/udp"
```

**Opção B** (atual em dev): script `scripts/rtp-nat.sh` faz iptables
DNAT manualmente. Tem que rodar com sudo após cada reboot.

Em prod, também precisa port-forward no firewall externo se houver.

### 6.6 Bug AudioSocket types (já resolvido)

Bridge envia frames slin8 (320 bytes, type 0x10) — correto pra
Asterisk 21.x que não tem slin16 (PR #1492 cherry-pick ainda não
chegou). Quando upgrade pra Asterisk 22+ com slin16 ativo, trocar
bridge pra `resample_24k_to_16k` + CHUNK=640 + type 0x12 (já tem
infraestrutura no resample.py).

---

## 7. Verificações pós-deploy

- [ ] `https://logto.pekiart.com.br/oidc/.well-known/openid-configuration`
      retorna JSON com issuer
- [ ] Cada produto: visitar URL → "Entrar" → redireciona pro Logto →
      loga → callback OK → app carrega autenticado
- [ ] Logado em 1 produto, abrir outro → sem novo login (SSO cross-app)
- [ ] Portal: criar tenant, provisioning PBX cria v_domain no FusionPBX
- [ ] Portal: criar channel voice_did, gateway aparece REGED em
      `sofia status gateway`
- [ ] Inbound call test: chamada do provedor → bridge → AI agent fala
- [ ] Outbound call test: ramal disca pra externo → áudio bidirecional

---

## 8. Pendências conhecidas (não bloqueantes)

- Inbound dialplan creation no portal: hoje manual via SQL. Adicionar
  helper `createInboundRoute()` em `src/lib/fusionpbx/` paralelo a
  `createGateway()`.
- TENANT_SLUG no Asterisk: hardcoded. Refator pra ler header SIP.
- Org name lookup nos sidebars: hoje mostra ID truncado. M2M app +
  Logto Management API.
- Single sign-OUT cross-app: logout num produto não desloga dos outros.
  Implementar back-channel logout ou redirect chain.
