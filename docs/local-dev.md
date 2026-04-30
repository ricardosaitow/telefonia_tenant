# Ambiente de desenvolvimento local

Guia pra ter o stack completo (portal + telefonia) rodando na sua máquina
Linux. Assume Ubuntu/Debian/Arch — ajuste os `apt`/`pacman` conforme
distro.

A ideia: você desenvolve local, o VPS é prod. Push pro GitHub, depois
SSH no VPS pra `git pull` + restart. Workflow manual por enquanto (CI/CD
fica pra depois).

---

## 1. Pré-requisitos

```bash
# Node 22 + pnpm 10 via corepack
curl -fsSL https://nodejs.org/dist/v22.22.2/node-v22.22.2-linux-x64.tar.xz \
  | sudo tar -xJ -C /opt
sudo ln -sf /opt/node-v22.22.2-linux-x64/bin/{node,npm,npx,corepack} \
  /usr/local/bin/
corepack enable && corepack prepare pnpm@10.33.2 --activate

# Docker + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # logout/login pra valer
sudo systemctl enable --now docker

# Git + build essentials
sudo apt install -y git build-essential

# Verifica:
node -v   # v22.22.2
pnpm -v   # 10.33.2
docker --version
docker compose version
```

## 2. SSH key + clone

```bash
# Key dedicada pro Pekiart (separa de outras chaves do GitHub)
ssh-keygen -t ed25519 -C "ricardo-pekiart" -f ~/.ssh/github_pekiart -N ""

# Adicionar a public key em https://github.com/settings/keys
cat ~/.ssh/github_pekiart.pub

# Configurar SSH alias
cat >> ~/.ssh/config << 'EOF'
Host github-pekiart
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_pekiart
  IdentitiesOnly yes
EOF

mkdir -p ~/projects && cd ~/projects
git clone git@github-pekiart:ricardosaitow/telefonia_tenant.git portal
git clone git@github-pekiart:ricardosaitow/telefonia_ia.git telefonia-ia
```

> Os nomes exatos dos repos no GitHub podem variar — confira no remote
> do VPS (`git -C /root/portal remote -v`) se quiser certeza absoluta.

## 3. Portal — só Next.js + Postgres (80% do dev)

A maior parte do trabalho (UI, server actions, schema, fluxos) usa só
isso. Não precisa subir telefonia.

```bash
cd ~/projects/portal

# Copiar .env.example pra .env
cp .env.example .env

# Editar .env. Os essenciais pra dev:
#   AUTH_SECRET=<gerar com: openssl rand -base64 32>
#   INFISICAL_* e RESEND_API_KEY pode deixar vazio em dev (fluxos
#   dependentes vão fallar com erro claro, mas não derrubam app)
sed -i "s|AUTH_SECRET=\"CHANGE_ME\"|AUTH_SECRET=\"$(openssl rand -base64 32)\"|" .env

# Subir Postgres (porta 5444 do host)
docker compose -f docker-compose.dev.yml up -d

# Aplicar migrations
pnpm install
pnpm db:migrate

# Setup da role bridge_reader (necessária quando subir o bridge local)
docker exec -i portal_postgres_dev psql -U postgres -d portal_dev \
  < scripts/setup-bridge-reader-role.sql

# Subir Next.js
pnpm dev   # http://localhost:3000
```

Banco vai começar **vazio**. Faça signup, crie tenant, crie agent, edita
no wizard. Não puxe dados de prod pra dev — fluxo é só o contrário (você
faz migrations no dev, depois aplica no VPS).

### Comandos úteis dentro de `portal/`

```bash
pnpm dev               # next dev
pnpm verify            # lint + type-check + test:rls — rodar antes de commit
pnpm db:migrate        # aplicar migrations
pnpm db:studio         # Prisma Studio (UI do banco)
pnpm test              # vitest unit
pnpm test:rls          # suite anti-cross-tenant (tem que passar SEMPRE)
```

## 4. Telefonia — stack completo (pra testar ligação local)

Necessário pra debugar bridge, dialplan, integração end-to-end. Pra dev
de UI/wizard, pula essa seção.

```bash
cd ~/projects/telefonia-ia

# Copiar .env.example pra .env e adicionar GEMINI_API_KEY
cp .env.example .env
# Editar .env: GEMINI_API_KEY=<sua-chave-google-ai>

# Os secrets/*.txt já vêm com valores dev no repo (incluindo
# secrets/portal_db_password.txt = 'dev_bridge_password').

# Subir o stack — primeira vez vai buildar Asterisk (~10min) e bridge (~2min)
docker compose up -d --build asterisk bridge-ia fusionpbx fusionpbx_db mailer

# Confere status
docker compose ps
docker logs tel_bridge --tail 30   # deve mostrar "bridge ouvindo em 0.0.0.0:9092"
                                    # + "portal_db.init_pool: conectado"
                                    # + "AMI: login OK"
```

### Provisionar um tenant local + agente

Como o portal local começa vazio, você precisa fazer o setup uma vez:

1. **Signup no portal local** — http://localhost:3000/signup → cria
   Account + Tenant.
2. **Anotar o `tenant.slug`** que foi gerado (algo como `pekiart-XXXX`).
   Ver no banco:
   ```bash
   docker exec portal_postgres_dev psql -U postgres -d portal_dev \
     -c "SELECT slug, nome_fantasia FROM tenants;"
   ```
3. **Criar departamento** (`/departments/new`) e **agente**
   (`/agents/new`).
4. **Configurar agente no wizard** e **publicar v1** (botão "Publicar"
   no topo da página de edição).
5. **Anotar o `agent.id`**:
   ```bash
   docker exec portal_postgres_dev psql -U postgres -d portal_dev \
     -c "SELECT id, nome, status, current_version_id FROM agents;"
   ```
6. **Mapear extensão `9999` → agente** via seed:
   ```bash
   cd ~/projects/portal
   pnpm tsx --env-file=.env scripts/seed-test-channel.ts \
     <tenant-slug> <agent-id> 9999
   ```

### Cliente SIP pra ligar

Linux: instala Linphone (gráfico) ou MicroSIP (Windows).

```bash
sudo apt install linphone
```

Configurar conta SIP no Linphone:

- **Username:** ramal criado no FusionPBX (precisa criar via UI dele)
- **Domain:** `127.0.0.1` ou `localhost`
- **Transport:** UDP, port 5060

Disca `9999` → cai no Asterisk → AudioSocket pro bridge → bridge resolve
o agente publicado → Gemini Live atende.

> Pra criar ramal SIP no FusionPBX: acessa a UI (porta 80/443 do
> container `tel_fusionpbx`), faz login admin, vai em **Accounts →
> Extensions → Add**.

## 5. Workflow de deploy manual

Sem CI/CD por enquanto. Padrão:

```bash
# === Local: depois de fazer mudança ===
cd ~/projects/portal
git checkout -b feature/x         # ou trabalha direto na main se solo
# ... edita, commita ...
pnpm verify                        # gate antes de push
git push origin feature/x
# (opcional) abre PR no GitHub e merge

# === No VPS, via SSH ===
ssh root@<vps-ip>
cd /root/portal
git pull origin main
pnpm install        # se package.json mudou
pnpm db:migrate     # se houve nova migration

# Restart do Next.js (modo dev no VPS — vai virar prod depois):
pkill -f "next dev"
cd /root/portal && nohup pnpm dev > /tmp/portal.log 2>&1 &
```

Pro bridge (data plane):

```bash
cd ~/projects/telefonia-ia
# ... edita bridge-ia/src/, dialplan, etc ...
git push origin main

# === No VPS ===
cd /root/telefonia-ia
git pull origin main
docker compose build bridge-ia    # ou asterisk se mudou dialplan/manager.conf
docker compose up -d bridge-ia    # idem
```

## 6. Troubleshooting comum

### `docker exec ... permission denied`

Você precisa estar no grupo `docker`. Logout/login depois de
`sudo usermod -aG docker $USER`.

### Portal `pnpm dev` falha com "DATABASE_URL not defined"

Esqueceu de criar `.env` (veja §3). Ou esqueceu de subir o Postgres
(`docker compose -f docker-compose.dev.yml up -d`).

### Bridge não acha o agente — log `nenhum agente publicado para (slug, ext)`

Algum dos passos do "Provisionar tenant" foi pulado. Confere:

- `agent.current_version_id` IS NOT NULL (publicou?)
- Existe linha em `channels` com `identificador='9999'`?
- Existe `routing_rule` com `target_agent_id` certo?
- O `tenant.slug` no Asterisk dialplan (`__TENANT_SLUG=pekiart-teste-...`)
  bate com o slug do seu tenant local?

### Bridge log `portal_db.init_pool falhou`

Bridge não consegue alcançar Postgres do portal. Verifica:

- Postgres do portal subiu com `0.0.0.0:5444` (não `127.0.0.1:5444`)
- `docker exec tel_bridge getent hosts host.docker.internal` retorna
  `172.17.0.1` ou similar
- Senha em `secrets/portal_db_password.txt` bate com o que `bridge_reader`
  espera (default: `dev_bridge_password`)

### Asterisk AMI "login failed"

Senha no `etc-asterisk/manager.conf` precisa bater com
`secrets/ami_password.txt`. Hoje ambos têm o mesmo hash hardcoded.

### FusionPBX 5060 conflita com outro processo

Se você tem outro PBX/SIP rodando local, precisa parar antes ou mudar a
porta do FusionPBX no compose.

## 7. Diferenças dev local × VPS prod

| Item               | Local                           | VPS                                      |
| ------------------ | ------------------------------- | ---------------------------------------- |
| Postgres do portal | container, dados zerados        | container, dados reais                   |
| Next.js            | `pnpm dev` (HMR)                | `pnpm dev` (DÍVIDA — virar `next start`) |
| Domínio            | `localhost:3000`                | TBD (`portal.pekiart.com.br`?)           |
| TLS                | não tem                         | TBD (Cloudflare/Caddy)                   |
| Secrets            | dev hardcoded                   | mesma coisa hoje (DÍVIDA — Infisical)    |
| FusionPBX SIP      | só LAN, sem NAT externo         | acessível via Internet                   |
| Modelo Gemini      | `gemini-3.1-flash-live-preview` | `gemini-3.1-flash-live`                  |
| Logs do bridge     | `docker logs tel_bridge`        | idem (mesmo container)                   |
| Backup             | nenhum                          | nenhum (DÍVIDA — pgBackRest)             |

Itens marcados "DÍVIDA" são pendências documentadas em
`.claude/decisions.md` ou aqui mesmo. Atacar quando promover VPS pra
prod de verdade.
